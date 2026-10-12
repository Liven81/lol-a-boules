// ========================================
// LOL à boules - Applicatie
// ========================================


// 1. Navigatie tussen de onderdelen
const views = {
    overview: [
        "De competitie",
        "Alles voor LOL à boules 2027 op één plek."
    ],
    standings: [
        "Het klassement",
        "Volg de strijd om de eerste plaats."
    ],
    matches: [
        "Wedstrijdkalender",
        "Bekijk de geplande en bevestigde wedstrijden."
    ],
    teams: [
        "De teams",
        "Leer de deelnemende teams kennen."
    ]
};

function showView(view) {
    const selected = Object.hasOwn(views, view) ? view : "overview";

    Object.keys(views).forEach(name => {
        const section = document.getElementById(name + "View");

        if (section) {
            section.classList.toggle("hidden", name !== selected);
        }
    });

    document.querySelectorAll("nav [data-view]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === selected
        );
    });

    document.getElementById("sectionTitle").textContent =
        views[selected][0];

    document.getElementById("sectionSubtitle").textContent =
        views[selected][1];
}

document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        showView(button.dataset.view);
    });
});


// 2. Beheerdersknop
document.getElementById("adminButton").addEventListener("click", () => {
    alert(
        "De beveiligde beheerderslogin bouwen we in een volgende stap."
    );
});


// 3. Verbinding met Supabase
const SUPABASE_URL = "https://uldmdrhrrniynbgecsby.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aHpSMc2mXDJRM-FBvJ1GDA_gMByWSNY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// 4. Speellocaties ophalen
async function laadLocaties() {
    const locatieLijst = document.getElementById("locatie-lijst");

    if (!locatieLijst) {
        return;
    }

    locatieLijst.innerHTML = "<p>Locaties laden...</p>";

    // Locaties ophalen
    const { data: locaties, error: locatieFout } = await supabaseClient
        .from("venues")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

    if (locatieFout) {
        locatieLijst.innerHTML =
            "<p>De locaties konden niet worden geladen.</p>";

        console.error("Fout bij ophalen locaties:", locatieFout.message);
        return;
    }

    if (!locaties || locaties.length === 0) {
        locatieLijst.innerHTML =
            "<p>Er zijn nog geen locaties beschikbaar.</p>";
        return;
    }

    // Speelpleinen ophalen
    const { data: pleinen, error: pleinFout } = await supabaseClient
        .from("courts")
        .select("id, venue_id, name")
        .eq("is_active", true)
        .order("name");

    if (pleinFout) {
        locatieLijst.innerHTML =
            "<p>De speelpleinen konden niet worden geladen.</p>";

        console.error("Fout bij ophalen speelpleinen:", pleinFout.message);
        return;
    }

    // Locaties en hun speelpleinen weergeven
    locatieLijst.innerHTML = locaties.map(locatie => {
        const locatiePleinen = (pleinen || []).filter(
            plein => plein.venue_id === locatie.id
        );

        const aantal = locatiePleinen.length;
        const pleinTekst = aantal === 1
            ? "speelplein"
            : "speelpleinen";

        return `
            <div class="locatie-kaart">
                <h3>${locatie.name}</h3>

                <p class="locatie-aantal">
                    <strong>${aantal}</strong> ${pleinTekst}
                </p>

                ${
                    aantal > 0
                        ? `
                            <ul class="plein-lijst">
                                ${locatiePleinen.map(plein => `
                                    <li>${plein.name}</li>
                                `).join("")}
                            </ul>
                        `
                        : "<p class=\"geen-pleinen\">Nog geen speelpleinen.</p>"
                }
            </div>
        `;
    }).join("");
}

laadLocaties();
