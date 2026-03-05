/**
 * PDF Katalog – Frontend Application v2.0
 * ========================================
 * PDF rendering, TOC accordion, real-time search,
 * double-page view (toggle), page-flip animation.
 */

(function () {
    'use strict';

    var DATA   = window.pdkData || {};
    var TOC    = DATA.toc || [];
    var PDF_URL = DATA.pdfUrl || '';
    var WORKER  = DATA.workerSrc || '';

    var pdfDoc      = null;
    var currentPage = 1;
    var totalPages  = 0;
    var scale       = 1.0;
    var rendering   = false;
    var pendingRender = null;
    var pageTexts   = {};
    var textExtracted = false;
    var doubleMode  = false;
    var flipping    = false;

    /* DOM helpers */
    var $ = function (s) { return document.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

    var elRoot       = $('#pdk-katalog');
    var elSidebar    = $('#pdk-sidebar');
    var elToc        = $('#pdk-toc');
    var elCanvasWrap = $('#pdk-canvas-wrap');
    var elBook       = $('#pdk-book');
    var elCanvasL    = $('#pdk-canvas-left');
    var elCanvasR    = $('#pdk-canvas-right');
    var elLoading    = $('#pdk-loading');
    var elSearch     = $('#pdk-search');
    var elSearchClear = $('#pdk-search-clear');
    var elSearchInfo = $('#pdk-search-results-info');
    var elPageInput  = $('#pdk-page-input');
    var elPageTotal  = $('#pdk-page-total');
    var elZoomLevel  = $('#pdk-zoom-level');
    var ctxL         = elCanvasL.getContext('2d');
    var ctxR         = elCanvasR.getContext('2d');

    if (!PDF_URL) return;

    /* ═══════════════════════════════════════
       1. Build TOC Accordion
       ═══════════════════════════════════════ */

    function buildTOC() {
        var html = '';
        TOC.forEach(function (ch, ci) {
            var fp = ch.items && ch.items.length ? ch.items[0].page : 1;
            html += '<div class="pdk-chapter" data-chapter="' + ci + '">';
            html +=   '<button class="pdk-chapter-btn" data-first-page="' + fp + '">';
            html +=     '<span class="pdk-chapter-label">' + escHTML(ch.chapter) + '</span>';
            html +=     '<svg class="pdk-chapter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 6 15 12 9 18"/></svg>';
            html +=   '</button>';
            html +=   '<div class="pdk-chapter-items">';
            (ch.items || []).forEach(function (item) {
                html += '<a class="pdk-item" data-page="' + item.page + '" href="#">';
                html +=   '<span class="pdk-item-label">' + escHTML(item.title) + '</span>';
                html +=   '<span class="pdk-item-page">S. ' + item.page + '</span>';
                html += '</a>';
            });
            html += '</div></div>';
        });
        elToc.innerHTML = html;

        $$('.pdk-chapter-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var ch = btn.closest('.pdk-chapter');
                var wasOpen = ch.classList.contains('pdk-open');
                $$('.pdk-chapter').forEach(function (c) { c.classList.remove('pdk-open'); });
                if (!wasOpen) ch.classList.add('pdk-open');
            });
        });

        $$('.pdk-item').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var p = parseInt(a.dataset.page, 10);
                if (p) goToPage(p);
            });
        });
    }

    /* ═══════════════════════════════════════
       2. PDF.js – Load & Render
       ═══════════════════════════════════════ */

    function initPDF() {
        pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
        pdfjsLib.getDocument(PDF_URL).promise.then(function (pdf) {
            pdfDoc = pdf;
            totalPages = pdf.numPages;
            elPageTotal.textContent = totalPages;
            elPageInput.max = totalPages;
            elLoading.classList.add('pdk-loaded');
            renderCurrent();
            extractAllText();
        }).catch(function (err) {
            elLoading.innerHTML = '<span style="color:var(--pdk-accent);">Fehler beim Laden.</span><br><small>' + escHTML(String(err)) + '</small>';
        });
    }

    function renderPageToCanvas(pageNum, canvas, ctx, cb) {
        pdfDoc.getPage(pageNum).then(function (page) {
            var vp = page.getViewport({ scale: scale });
            var dpr = window.devicePixelRatio || 1;
            canvas.width  = vp.width  * dpr;
            canvas.height = vp.height * dpr;
            canvas.style.width  = vp.width  + 'px';
            canvas.style.height = vp.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
                if (cb) cb();
            });
        });
    }

    function renderCurrent() {
        if (rendering) { pendingRender = true; return; }
        rendering = true;

        // In double mode: left=currentPage, right=currentPage+1
        // Align to spreads: even page on left (or first page alone)
        var leftPage  = currentPage;
        var rightPage = doubleMode ? currentPage + 1 : 0;

        if (doubleMode && rightPage > totalPages) rightPage = 0;

        var done = 0;
        var needed = rightPage > 0 ? 2 : 1;

        function checkDone() {
            done++;
            if (done >= needed) {
                rendering = false;
                if (pendingRender) { pendingRender = false; renderCurrent(); }
            }
        }

        renderPageToCanvas(leftPage, elCanvasL, ctxL, checkDone);

        if (rightPage > 0) {
            elCanvasR.style.display = 'block';
            renderPageToCanvas(rightPage, elCanvasR, ctxR, checkDone);
        } else {
            elCanvasR.style.display = 'none';
            if (needed === 1) { /* only left needed */ }
        }

        elPageInput.value = currentPage;
        updatePageInfoLabel();
        updateTocHighlight();
    }

    function updatePageInfoLabel() {
        if (doubleMode && currentPage + 1 <= totalPages) {
            elPageInput.value = currentPage;
        } else {
            elPageInput.value = currentPage;
        }
    }

    function goToPage(num) {
        num = Math.max(1, Math.min(num, totalPages));
        if (doubleMode && num > 1 && num % 2 === 0) {
            // In double-mode keep left page odd (book-spread alignment)
            // But only if we want to enforce spreads — let's keep it flexible
        }
        var oldPage = currentPage;
        currentPage = num;

        if (oldPage !== num && !flipping) {
            animateFlip(oldPage < num ? 'forward' : 'backward', function () {
                renderCurrent();
            });
        } else {
            renderCurrent();
        }
        elCanvasWrap.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function calcFitScale() {
        if (!pdfDoc) return;
        pdfDoc.getPage(currentPage).then(function (page) {
            var vp = page.getViewport({ scale: 1 });
            var wrapW = elCanvasWrap.clientWidth - 48;
            var wrapH = elCanvasWrap.clientHeight - 48;
            var pageW = doubleMode ? vp.width * 2 + 6 : vp.width;
            scale = Math.min(wrapW / pageW, wrapH / vp.height, 2.5);
            scale = Math.max(scale, 0.3);
            updateZoomDisplay();
            renderCurrent();
        });
    }

    function updateZoomDisplay() {
        elZoomLevel.textContent = Math.round(scale * 100) + ' %';
    }

    function updateTocHighlight() {
        var bestItem = null, bestPage = 0;
        $$('.pdk-item').forEach(function (a) {
            var p = parseInt(a.dataset.page, 10);
            if (p <= currentPage && p > bestPage) { bestPage = p; bestItem = a; }
        });
        $$('.pdk-item').forEach(function (a) { a.classList.remove('pdk-active'); });
        if (bestItem) {
            bestItem.classList.add('pdk-active');
            bestItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    /* ═══════════════════════════════════════
       3. PAGE FLIP ANIMATION
       ═══════════════════════════════════════ */

    function animateFlip(direction, onComplete) {
        if (flipping) { onComplete(); return; }

        // In single-page mode, do a simpler flip
        flipping = true;
        elBook.classList.add('pdk-flipping');

        var flipContainer = document.createElement('div');
        flipContainer.className = 'pdk-flip-container';

        var flipCanvas = document.createElement('canvas');
        flipContainer.appendChild(flipCanvas);

        // Clone current page onto flip canvas
        var sourceCanvas = (direction === 'forward') ? elCanvasL : elCanvasL;
        if (doubleMode && direction === 'backward') {
            sourceCanvas = elCanvasL;
        }

        flipCanvas.width  = sourceCanvas.width;
        flipCanvas.height = sourceCanvas.height;
        flipCanvas.style.width  = sourceCanvas.style.width;
        flipCanvas.style.height = sourceCanvas.style.height;
        flipCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0);

        if (direction === 'forward') {
            flipContainer.classList.add('pdk-flip-forward');
        } else {
            flipContainer.classList.add('pdk-flip-backward');
        }

        elBook.appendChild(flipContainer);

        // End animation
        flipContainer.addEventListener('animationend', function () {
            elBook.removeChild(flipContainer);
            elBook.classList.remove('pdk-flipping');
            flipping = false;
            onComplete();
        });

        // Safety timeout
        setTimeout(function () {
            if (flipping) {
                try { elBook.removeChild(flipContainer); } catch(e) {}
                elBook.classList.remove('pdk-flipping');
                flipping = false;
                onComplete();
            }
        }, 600);
    }

    /* ═══════════════════════════════════════
       4. Double-Page Toggle
       ═══════════════════════════════════════ */

    function setDoubleMode(on) {
        doubleMode = on;
        elBook.classList.toggle('pdk-single', !on);
        elBook.classList.toggle('pdk-double', on);
        var btn = $('#pdk-toggle-double');
        if (btn) btn.classList.toggle('pdk-btn-active', on);
        setTimeout(calcFitScale, 50);
    }

    /* ═══════════════════════════════════════
       5. Text Extraction (search)
       ═══════════════════════════════════════ */

    function extractAllText() {
        var queue = [];
        for (var i = 1; i <= totalPages; i++) queue.push(i);
        function next() {
            if (!queue.length) { textExtracted = true; return; }
            var pn = queue.shift();
            pdfDoc.getPage(pn).then(function (page) {
                return page.getTextContent();
            }).then(function (tc) {
                pageTexts[pn] = tc.items.map(function (t) { return t.str; }).join(' ').toLowerCase();
                setTimeout(next, 5);
            });
        }
        next(); next(); next();
    }

    /* ═══════════════════════════════════════
       6. Real-time Search
       ═══════════════════════════════════════ */

    var searchTimeout;

    function onSearchInput() {
        clearTimeout(searchTimeout);
        var q = elSearch.value.trim().toLowerCase();
        elSearchClear.style.display = q ? 'block' : 'none';
        if (!q) { resetSearch(); return; }
        searchTimeout = setTimeout(function () { performSearch(q); }, 200);
    }

    function performSearch(query) {
        var tocHitPages = new Set();
        var chapterHits = new Set();

        $$('.pdk-item').forEach(function (a) {
            var label = (a.querySelector('.pdk-item-label').textContent || '').toLowerCase();
            var match = label.indexOf(query) !== -1;
            a.classList.toggle('pdk-search-hit', match);
            a.classList.toggle('pdk-search-hidden', !match);
            if (match) {
                tocHitPages.add(parseInt(a.dataset.page, 10));
                chapterHits.add(a.closest('.pdk-chapter').dataset.chapter);
                a.querySelector('.pdk-item-label').innerHTML = highlightText(a.querySelector('.pdk-item-label').textContent, query);
            } else {
                a.querySelector('.pdk-item-label').innerHTML = escHTML(a.querySelector('.pdk-item-label').textContent);
            }
        });

        $$('.pdk-chapter').forEach(function (ch) {
            var cIdx = ch.dataset.chapter;
            var chLabel = (ch.querySelector('.pdk-chapter-label').textContent || '').toLowerCase();
            var chMatch = chLabel.indexOf(query) !== -1;
            if (chMatch) {
                ch.classList.remove('pdk-search-hidden'); ch.classList.add('pdk-open');
                ch.querySelectorAll('.pdk-item').forEach(function (a) { a.classList.remove('pdk-search-hidden'); a.classList.add('pdk-search-hit'); });
                ch.querySelector('.pdk-chapter-label').innerHTML = highlightText(ch.querySelector('.pdk-chapter-label').textContent, query);
            } else if (chapterHits.has(cIdx)) {
                ch.classList.remove('pdk-search-hidden'); ch.classList.add('pdk-open');
                ch.querySelector('.pdk-chapter-label').innerHTML = escHTML(ch.querySelector('.pdk-chapter-label').textContent);
            } else {
                ch.classList.add('pdk-search-hidden');
                ch.querySelector('.pdk-chapter-label').innerHTML = escHTML(ch.querySelector('.pdk-chapter-label').textContent);
            }
        });

        var pdfHitPages = [];
        if (textExtracted) {
            for (var pn = 1; pn <= totalPages; pn++) {
                if (pageTexts[pn] && pageTexts[pn].indexOf(query) !== -1) pdfHitPages.push(pn);
            }
        }

        var allSet = new Set();
        tocHitPages.forEach(function(p){ allSet.add(p); });
        pdfHitPages.forEach(function(p){ allSet.add(p); });
        var allHitPages = Array.from(allSet).sort(function (a, b) { return a - b; });

        if (allHitPages.length) {
            var extraPdf = pdfHitPages.filter(function (p) { return !tocHitPages.has(p); });
            var msg = allHitPages.length + ' Treffer gefunden';
            if (extraPdf.length) {
                msg += ' · PDF-Seiten: ' + extraPdf.slice(0, 15).join(', ');
                if (extraPdf.length > 15) msg += '…';
            }
            elSearchInfo.textContent = msg;
            elSearchInfo.style.display = 'block';
            if (allHitPages.indexOf(currentPage) === -1) goToPage(allHitPages[0]);
        } else {
            elSearchInfo.textContent = 'Keine Treffer für „' + query + '"';
            elSearchInfo.style.display = 'block';
        }
    }

    function resetSearch() {
        elSearchInfo.style.display = 'none';
        $$('.pdk-chapter').forEach(function (ch) { ch.classList.remove('pdk-search-hidden', 'pdk-open'); });
        $$('.pdk-item').forEach(function (a) {
            a.classList.remove('pdk-search-hit', 'pdk-search-hidden', 'pdk-active');
            var el = a.querySelector('.pdk-item-label');
            el.innerHTML = escHTML(el.textContent);
        });
        $$('.pdk-chapter-label').forEach(function (el) { el.innerHTML = escHTML(el.textContent); });
        updateTocHighlight();
    }

    /* ═══════════════════════════════════════
       7. Event Listeners
       ═══════════════════════════════════════ */

    function bindEvents() {
        elSearch.addEventListener('input', onSearchInput);
        elSearchClear.addEventListener('click', function () {
            elSearch.value = ''; elSearchClear.style.display = 'none';
            resetSearch(); elSearch.focus();
        });

        // Page nav
        $('#pdk-prev').addEventListener('click', function () {
            goToPage(currentPage - (doubleMode ? 2 : 1));
        });
        $('#pdk-next').addEventListener('click', function () {
            goToPage(currentPage + (doubleMode ? 2 : 1));
        });
        elPageInput.addEventListener('change', function () { goToPage(parseInt(this.value, 10) || 1); });
        elPageInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') goToPage(parseInt(this.value, 10) || 1);
        });

        // Zoom
        $('#pdk-zoom-in').addEventListener('click', function () {
            scale = Math.min(scale + 0.2, 4); updateZoomDisplay(); renderCurrent();
        });
        $('#pdk-zoom-out').addEventListener('click', function () {
            scale = Math.max(scale - 0.2, 0.3); updateZoomDisplay(); renderCurrent();
        });
        $('#pdk-zoom-fit').addEventListener('click', calcFitScale);

        // Sidebar toggle
        $('#pdk-toggle-sidebar').addEventListener('click', function () {
            elSidebar.classList.toggle('pdk-hidden');
            setTimeout(calcFitScale, 400);
        });

        // Double-page toggle
        $('#pdk-toggle-double').addEventListener('click', function () {
            setDoubleMode(!doubleMode);
        });

        // Fullscreen
        $('#pdk-fullscreen').addEventListener('click', function () {
            if (!document.fullscreenElement) {
                elRoot.requestFullscreen().catch(function () { elRoot.classList.toggle('pdk-fullscreen'); });
            } else {
                document.exitFullscreen();
            }
        });
        document.addEventListener('fullscreenchange', function () {
            elRoot.classList.toggle('pdk-fullscreen', !!document.fullscreenElement);
            setTimeout(calcFitScale, 300);
        });

        // Click zones on the book to flip pages
        $('#pdk-click-prev').addEventListener('click', function () {
            goToPage(currentPage - (doubleMode ? 2 : 1));
        });
        $('#pdk-click-next').addEventListener('click', function () {
            goToPage(currentPage + (doubleMode ? 2 : 1));
        });

        // Keyboard
        document.addEventListener('keydown', function (e) {
            if (!elRoot.contains(document.activeElement) && document.activeElement !== document.body) return;
            if (e.target === elSearch || e.target === elPageInput) return;
            var step = doubleMode ? 2 : 1;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goToPage(currentPage + step); }
            if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); goToPage(currentPage - step); }
            if (e.key === 'Home') { e.preventDefault(); goToPage(1); }
            if (e.key === 'End')  { e.preventDefault(); goToPage(totalPages); }
        });

        // Resize
        var rt;
        window.addEventListener('resize', function () {
            clearTimeout(rt); rt = setTimeout(calcFitScale, 250);
        });
    }

    /* ═══════════════════════════════════════
       8. Helpers
       ═══════════════════════════════════════ */

    function escHTML(s) {
        var d = document.createElement('div'); d.textContent = s; return d.innerHTML;
    }
    function highlightText(text, query) {
        var esc = escHTML(text);
        var qEsc = escHTML(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return esc.replace(new RegExp('(' + qEsc + ')', 'gi'), '<mark class="pdk-highlight">$1</mark>');
    }

    /* ═══════════════════════════════════════
       9. Init
       ═══════════════════════════════════════ */

    function init() {
        buildTOC();
        bindEvents();
        setDoubleMode(false); // start in single mode
        initPDF();
        var fitCheck = setInterval(function () {
            if (pdfDoc) { clearInterval(fitCheck); calcFitScale(); }
        }, 300);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
