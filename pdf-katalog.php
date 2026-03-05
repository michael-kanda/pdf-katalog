<?php
/**
 * Plugin Name: PDF Blätterkatalog
 * Description: Interaktiver PDF-Katalog mit Echtzeit-Suche, Akkordion-Inhaltsverzeichnis, Doppelseiten-Ansicht und Blättereffekt.
 * Version: 2.0.0
 * Author: Custom Development
 * Text Domain: pdf-katalog
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'PDK_VERSION', '2.0.0' );
define( 'PDK_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'PDK_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/* ──────────────────────────────────────────────
   1. Admin-Seite
   ────────────────────────────────────────────── */

add_action( 'admin_menu', function () {
    add_options_page( 'PDF Katalog Einstellungen', 'PDF Katalog', 'manage_options', 'pdf-katalog-settings', 'pdk_settings_page' );
});

add_action( 'admin_init', function () {
    register_setting( 'pdk_settings_group', 'pdk_pdf_url' );
    register_setting( 'pdk_settings_group', 'pdk_toc_json' );
    register_setting( 'pdk_settings_group', 'pdk_accent_color' );
});

function pdk_settings_page() {
    $toc_json = get_option( 'pdk_toc_json', '' );
    $pdf_url  = get_option( 'pdk_pdf_url', '' );
    $accent   = get_option( 'pdk_accent_color', '#e63946' );
    ?>
    <div class="wrap">
        <h1>PDF Katalog – Einstellungen</h1>
        <form method="post" action="options.php">
            <?php settings_fields( 'pdk_settings_group' ); ?>
            <table class="form-table">
                <tr>
                    <th><label for="pdk_pdf_url">PDF-Datei URL</label></th>
                    <td>
                        <input type="url" id="pdk_pdf_url" name="pdk_pdf_url" value="<?php echo esc_attr( $pdf_url ); ?>" class="regular-text" style="width:100%;max-width:600px;" />
                        <p class="description">URL zur PDF-Datei (Mediathek hochladen und URL kopieren).</p>
                        <button type="button" class="button" id="pdk-upload-btn">PDF aus Mediathek wählen</button>
                    </td>
                </tr>
                <tr>
                    <th><label for="pdk_accent_color">Akzentfarbe</label></th>
                    <td><input type="color" id="pdk_accent_color" name="pdk_accent_color" value="<?php echo esc_attr( $accent ); ?>" /></td>
                </tr>
                <tr>
                    <th><label for="pdk_toc_json">Inhaltsverzeichnis (JSON)</label></th>
                    <td>
                        <textarea id="pdk_toc_json" name="pdk_toc_json" rows="20" style="width:100%;max-width:600px;font-family:monospace;font-size:13px;"><?php echo esc_textarea( $toc_json ); ?></textarea>
                        <p class="description">Format: <code>[{"chapter":"Name","items":[{"title":"...","page":6},...]}]</code></p>
                    </td>
                </tr>
            </table>
            <?php submit_button( 'Einstellungen speichern' ); ?>
        </form>
    </div>
    <script>
    jQuery(function($){
        $('#pdk-upload-btn').on('click', function(e){
            e.preventDefault();
            var frame = wp.media({ title:'PDF wählen', multiple:false, library:{type:'application/pdf'} });
            frame.on('select', function(){ $('#pdk_pdf_url').val(frame.state().get('selection').first().toJSON().url); });
            frame.open();
        });
    });
    </script>
    <?php
}

add_action( 'admin_enqueue_scripts', function ( $hook ) {
    if ( $hook === 'settings_page_pdf-katalog-settings' ) wp_enqueue_media();
});

/* ──────────────────────────────────────────────
   2. Default TOC bei Aktivierung
   ────────────────────────────────────────────── */

register_activation_hook( __FILE__, function () {
    if ( ! get_option( 'pdk_toc_json' ) ) {
        $toc = array(
            array('chapter'=>'Fahrerausrüstung','items'=>array(
                array('title'=>'Overalls','page'=>6),array('title'=>'Vintage-Bekleidung','page'=>14),
                array('title'=>'Fahrerschuhe','page'=>15),array('title'=>'Fahrerhandschuhe','page'=>18),
                array('title'=>'Unterwäsche','page'=>20),array('title'=>'HANS-Systeme','page'=>22),
                array('title'=>'Hybrid-Systeme','page'=>24),array('title'=>'Bell Helme','page'=>26),
                array('title'=>'Bell Helmzubehör','page'=>32),array('title'=>'Stilo Helme','page'=>34),
                array('title'=>'Stilo Helmzubehör','page'=>40),array('title'=>'Helmtrockner, Pflegeprodukte','page'=>41),
                array('title'=>'Kommunikationssysteme','page'=>42),array('title'=>'Rallye-Intercom','page'=>44),
            )),
            array('chapter'=>'Mechaniker- und Kartausrüstung','items'=>array(
                array('title'=>'Taschen','page'=>48),array('title'=>'Teamwear','page'=>50),
                array('title'=>'Mechanikerbekleidung','page'=>52),array('title'=>'Kartoveralls','page'=>54),
                array('title'=>'Kartschuhe','page'=>58),array('title'=>'Karthandschuhe','page'=>60),
                array('title'=>'Karthelme','page'=>62),array('title'=>'Kart-Accessoires','page'=>65),
                array('title'=>'Kart-Protektoren','page'=>66),array('title'=>'Kartreifen','page'=>67),
            )),
            array('chapter'=>'Fahrzeugzubehör, Sicherheitsausrüstung','items'=>array(
                array('title'=>'Schalensitze','page'=>68),array('title'=>'Sitzadapter','page'=>78),
                array('title'=>'Sitzkonsolen','page'=>79),array('title'=>'Sitzkissen und Profi-Seat','page'=>80),
                array('title'=>'Klassik-Sitze','page'=>81),array('title'=>'Bürostühle','page'=>84),
                array('title'=>'Sim-Racing','page'=>85),array('title'=>'Gurte','page'=>86),
                array('title'=>'Fensternetze und Fahrernetze','page'=>93),array('title'=>'Lenkräder','page'=>94),
                array('title'=>'Lenkradschnellverschlüsse','page'=>97),array('title'=>'Lenkradnaben','page'=>98),
                array('title'=>'Pedalsets, Rallyezubehör','page'=>100),array('title'=>'Abschleppösen, Dachbelüftung','page'=>102),
                array('title'=>'Handfeuerlöscher','page'=>103),array('title'=>'Feuerlöschanlagen','page'=>104),
                array('title'=>'Überrollkäfige','page'=>108),array('title'=>'Käfigpolstermaterial, Gurtstreben','page'=>113),
            )),
            array('chapter'=>'Bremse, Kupplung und Getriebe','items'=>array(
                array('title'=>'Bremssättel','page'=>114),array('title'=>'Bremsenkits','page'=>118),
                array('title'=>'Rennbremsscheiben','page'=>121),array('title'=>'Bremssystem-Zubehör','page'=>126),
                array('title'=>'Bremsleitungskits','page'=>127),array('title'=>'Bremsscheiben','page'=>130),
                array('title'=>'Bremsbeläge','page'=>134),array('title'=>'Bremsflüssigkeit','page'=>156),
                array('title'=>'Bremskraftregler','page'=>157),array('title'=>'Brems- und Kupplungszylinder','page'=>158),
                array('title'=>'Waagebalken und Pedaleinheiten','page'=>162),array('title'=>'Handbremsen','page'=>168),
                array('title'=>'Belüftungsschläuche, Air Ducts','page'=>169),array('title'=>'Schnellkupplungen','page'=>171),
                array('title'=>'Bremsentlüftung','page'=>172),array('title'=>'ZF Sachs RCS-Kupplungen','page'=>173),
                array('title'=>'Kupplungskits, Carbon-Kupplungen','page'=>183),array('title'=>'Tilton Motorsport-Kupplungen','page'=>184),
                array('title'=>'Ausrücklager','page'=>186),array('title'=>'Sachs Performance-Kupplungen','page'=>188),
            )),
            array('chapter'=>'Instrumente und Elektrozubehör','items'=>array(
                array('title'=>'Zusatzinstrumente','page'=>194),array('title'=>'Ganganzeigen, Schaltlampen','page'=>201),
                array('title'=>'Garmin Catalyst','page'=>202),array('title'=>'Data Logging und Laptimer','page'=>203),
                array('title'=>'Batterien','page'=>206),array('title'=>'Schalter und Elektrozubehör','page'=>208),
                array('title'=>'Hauptschalter und PDM','page'=>210),array('title'=>'Scheinwerfer','page'=>212),
                array('title'=>'Regenleuchten','page'=>217),array('title'=>'Rallye-Tripmaster','page'=>218),
            )),
            array('chapter'=>'Boxenzubehör und Vermessungsgeräte','items'=>array(
                array('title'=>'Boxentafeln und Stoppuhren','page'=>220),array('title'=>'Rampen und Bodenplatten','page'=>222),
                array('title'=>'Schnellheber und Chassis-Ständer','page'=>224),array('title'=>'Reifenwagen und Race-Tape','page'=>226),
                array('title'=>'Luftprüfer und Temperaturmessgeräte','page'=>228),array('title'=>'Radlastwaagen','page'=>230),
                array('title'=>'Sturz- und Nachlaufmessgeräte','page'=>233),array('title'=>'Spurmessgeräte, Hub Stands','page'=>234),
            )),
            array('chapter'=>'Alles rund um Benzin, Öl und Wasser','items'=>array(
                array('title'=>'Sicherheitstanks','page'=>236),array('title'=>'Catchtanks und Tankanzeige','page'=>238),
                array('title'=>'Tankdeckel und Entlüftungsventile','page'=>240),array('title'=>'Benzinpumpen und Druckregler','page'=>242),
                array('title'=>'Kanister und Schnellbetankung','page'=>246),array('title'=>'Ölkühler und Zubehör','page'=>248),
                array('title'=>'Ölsammelbehälter und Öldruckspeicher','page'=>252),array('title'=>'Trockensumpf-Ölpumpen','page'=>254),
                array('title'=>'Motoren- und Getriebeöle','page'=>256),array('title'=>'Oldtimer-Öle','page'=>260),
                array('title'=>'Hawk wasserlose Kühlmittel','page'=>262),array('title'=>'Ventilatoren, Wasserbehälter, Wiggins','page'=>264),
                array('title'=>'Wasserkühler, Ladeluftkühler, Turbo-Ventile','page'=>266),array('title'=>'Samco Silikonschläuche','page'=>268),
                array('title'=>'Samco Silikon-Schlauchkits','page'=>274),array('title'=>'Wasserpumpen, Getriebeölpumpen','page'=>276),
            )),
            array('chapter'=>'Technische Spezialprodukte','items'=>array(
                array('title'=>'Hitzeschutzprodukte','page'=>278),array('title'=>'Pflegeprodukte und Reiniger','page'=>281),
                array('title'=>'Auspuff-Universalteile','page'=>282),array('title'=>'Motorsport-Katalysatoren','page'=>284),
                array('title'=>'Tuning-Katalysatoren','page'=>286),array('title'=>'Spiegel und Macrolon-Scheiben','page'=>288),
                array('title'=>'Haubenhalter','page'=>290),array('title'=>'Befestigungssysteme (Camloc, Dzus)','page'=>292),
                array('title'=>'ARP Schrauben & Stehbolzen','page'=>296),array('title'=>'Luftheber und Zubehör','page'=>298),
                array('title'=>'Uniball-Gelenke','page'=>300),array('title'=>'Fahrwerksbuchsen','page'=>302),
                array('title'=>'Fahrwerksfedern','page'=>305),array('title'=>'Radbolzen, Spikes, Gelenke','page'=>306),
                array('title'=>'Vergaser und Heizdecken','page'=>308),array('title'=>'Luftfilter','page'=>309),
            )),
            array('chapter'=>'Leitungssysteme und Zubehör','items'=>array(
                array('title'=>'Gewindetabelle und Montageanleitungen','page'=>312),array('title'=>'Schlauchsystem Serie 200/210','page'=>314),
                array('title'=>'Schlauchsystem Serie 600','page'=>317),array('title'=>'Schlauchsystem Serie 811/910','page'=>318),
                array('title'=>'Alu-Rohrleitungen','page'=>319),array('title'=>'Verbindungsadapter','page'=>320),
                array('title'=>'Ventile und Schnellkupplungen','page'=>324),array('title'=>'Filter und Gummi-Schläuche','page'=>326),
                array('title'=>'Brems- und Kupplungsleitungen','page'=>328),array('title'=>'Rohrleitungen und Werkzeuge','page'=>334),
            )),
        );
        update_option( 'pdk_toc_json', wp_json_encode( $toc, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT ) );
    }
    if ( ! get_option( 'pdk_accent_color' ) ) {
        update_option( 'pdk_accent_color', '#e63946' );
    }
});

/* ──────────────────────────────────────────────
   3. Shortcode  [pdf_katalog]
   ────────────────────────────────────────────── */

add_shortcode( 'pdf_katalog', function ( $atts ) {
    $pdf_url = get_option( 'pdk_pdf_url', '' );
    $toc     = get_option( 'pdk_toc_json', '[]' );
    $accent  = get_option( 'pdk_accent_color', '#e63946' );

    if ( empty( $pdf_url ) ) {
        return '<p style="color:red;font-weight:bold;">PDF Katalog: Bitte PDF-URL in den Einstellungen hinterlegen.</p>';
    }

    wp_enqueue_style( 'pdk-style', PDK_PLUGIN_URL . 'assets/css/katalog.css', array(), PDK_VERSION );
    wp_enqueue_script( 'pdfjs', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', array(), '3.11.174', true );
    wp_enqueue_script( 'pdk-app', PDK_PLUGIN_URL . 'assets/js/katalog.js', array( 'pdfjs' ), PDK_VERSION, true );

    wp_localize_script( 'pdk-app', 'pdkData', array(
        'pdfUrl'      => esc_url( $pdf_url ),
        'toc'         => json_decode( $toc, true ),
        'accentColor' => sanitize_hex_color( $accent ),
        'workerSrc'   => 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    ) );

    ob_start();
    ?>
    <div id="pdk-katalog" style="--pdk-accent:<?php echo esc_attr( $accent ); ?>;">

        <!-- Sidebar -->
        <aside id="pdk-sidebar">
            <div id="pdk-sidebar-header">
                <h2 id="pdk-logo">Katalog <span>2026 / 2027</span></h2>
                <div id="pdk-search-wrap">
                    <svg id="pdk-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" id="pdk-search" placeholder="Suche im Katalog…" autocomplete="off" />
                    <button id="pdk-search-clear" type="button" aria-label="Suche löschen">&times;</button>
                </div>
                <div id="pdk-search-results-info" style="display:none;"></div>
            </div>
            <nav id="pdk-toc" role="navigation" aria-label="Inhaltsverzeichnis"></nav>
        </aside>

        <!-- Main Viewer -->
        <main id="pdk-viewer">
            <div id="pdk-toolbar">
                <button id="pdk-toggle-sidebar" type="button" aria-label="Seitenleiste">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>

                <!-- Double-page toggle -->
                <button id="pdk-toggle-double" type="button" aria-label="Doppelseite" title="Doppelseiten-Ansicht">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="8" height="18" rx="1"/><rect x="14" y="3" width="8" height="18" rx="1"/></svg>
                </button>

                <span class="pdk-toolbar-sep"></span>

                <div id="pdk-page-nav">
                    <button id="pdk-prev" type="button" aria-label="Vorherige Seite">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <span id="pdk-page-info">
                        Seite <input type="number" id="pdk-page-input" min="1" value="1" /> von <span id="pdk-page-total">–</span>
                    </span>
                    <button id="pdk-next" type="button" aria-label="Nächste Seite">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
                <div id="pdk-zoom-controls">
                    <button id="pdk-zoom-out" type="button" aria-label="Verkleinern">−</button>
                    <span id="pdk-zoom-level">100 %</span>
                    <button id="pdk-zoom-in" type="button" aria-label="Vergrößern">+</button>
                    <button id="pdk-zoom-fit" type="button" aria-label="Einpassen">⊡</button>
                </div>
                <button id="pdk-fullscreen" type="button" aria-label="Vollbild">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                </button>
            </div>

            <div id="pdk-canvas-wrap">
                <div id="pdk-loading">
                    <div class="pdk-spinner"></div>
                    <span>Katalog wird geladen…</span>
                </div>

                <div id="pdk-book" class="pdk-single">
                    <!-- Click zones for page flipping -->
                    <div id="pdk-click-prev" class="pdk-click-prev"></div>
                    <div id="pdk-click-next" class="pdk-click-next"></div>

                    <!-- Flip shadow overlays -->
                    <div class="pdk-flip-shadow pdk-flip-shadow-l"></div>
                    <div class="pdk-flip-shadow pdk-flip-shadow-r"></div>

                    <!-- Left page (always visible) -->
                    <div class="pdk-page-left">
                        <canvas id="pdk-canvas-left"></canvas>
                    </div>

                    <!-- Spine (double-page only) -->
                    <div class="pdk-book-spine"></div>

                    <!-- Right page (double-page only) -->
                    <div class="pdk-page-right">
                        <canvas id="pdk-canvas-right"></canvas>
                    </div>
                </div>

                <div id="pdk-text-layer"></div>
            </div>
        </main>

    </div>
    <?php
    return ob_get_clean();
});
