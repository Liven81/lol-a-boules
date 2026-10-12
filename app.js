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

// Vul hier je eigen Supabase publishable key in.
const SUPABASE_PUBLISHABLE_KEY = "VUL_HIER_JE_PUBLISHABLE_KEY_IN";

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

    const { data, error } = await supabaseClient
        .from("venues")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

    if (error) {
        locatieLijst.innerHTML =
            "<p>De locaties konden niet worden geladen.</p>";

        console.error(
            "Fout bij ophalen locaties:",
            error.message
        );

        return;
    }

    if (!data || data.length === 0) {
        locatieLijst.innerHTML =
            "<p>Er zijn nog geen locaties beschikbaar.</p>";

        return;
    }

    locatieLijst.innerHTML = data.map(locatie => `
        <div class="locatie-kaart">
            <h3>${locatie.name}</h3>
        </div>
    `).join("");
}

laadLocaties();
