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

    const { data: pleinen, error: pleinFout } = await supabaseClient
        .from("courts")
        .select("id, venue_id")
        .eq("is_active", true);

    if (pleinFout) {
        locatieLijst.innerHTML =
            "<p>De speelpleinen konden niet worden geladen.</p>";

        console.error("Fout bij ophalen speelpleinen:", pleinFout.message);
        return;
    }

    locatieLijst.innerHTML = locaties.map(locatie => {
        const aantal = (pleinen || []).filter(
            plein => plein.venue_id === locatie.id
        ).length;

        const tekst = aantal === 1 ? "speelplein" : "speelpleinen";

        return `
            <div class="locatie-kaart">
                <h3>${locatie.name}</h3>
                <p class="locatie-aantal">
                    <strong>${aantal}</strong> ${tekst}
                </p>
            </div>
        `;
    }).join("");
}

laadLocaties();

// ========================================
// Wedstrijdplanning: keuzelijsten laden
// ========================================

async function laadWedstrijdFormulier() {
    const thuisSelect = document.getElementById("thuisploeg");
    const uitSelect = document.getElementById("uitploeg");
    const locatieSelect = document.getElementById("wedstrijd-locatie");
    const pleinSelect = document.getElementById("wedstrijd-plein");

    // Als het formulier niet op de pagina staat, niets doen
    if (!thuisSelect || !uitSelect || !locatieSelect || !pleinSelect) {
        return;
    }

    // Competitie ophalen
    const { data: competities, error: competitieFout } = await supabaseClient
        .from("competitions")
        .select("id, name")
        .eq("season_year", 2027)
        .limit(1);

    if (competitieFout || !competities || competities.length === 0) {
        console.error("Competitie laden mislukt:", competitieFout?.message);
        toonWedstrijdMelding("De competitie kon niet worden geladen.");
        return;
    }

    const competitieId = competities[0].id;

    // Teams van deze competitie ophalen
    const { data: teams, error: teamsFout } = await supabaseClient
        .from("teams")
        .select("id, name")
        .eq("competition_id", competitieId)
        .order("name");

    if (teamsFout) {
        console.error("Teams laden mislukt:", teamsFout.message);
        toonWedstrijdMelding("De teams konden niet worden geladen.");
        return;
    }

    const teamOpties = (teams || [])
        .map(team => `<option value="${team.id}">${escapeHtml(team.name)}</option>`)
        .join("");

    thuisSelect.innerHTML =
        '<option value="">Kies de thuisploeg</option>' + teamOpties;

    uitSelect.innerHTML =
        '<option value="">Kies de uitploeg</option>' + teamOpties;

    // Actieve locaties ophalen
    const { data: locaties, error: locatiesFout } = await supabaseClient
        .from("venues")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

    if (locatiesFout) {
        console.error("Locaties laden mislukt:", locatiesFout.message);
        toonWedstrijdMelding("De speellocaties konden niet worden geladen.");
        return;
    }

    locatieSelect.innerHTML =
        '<option value="">Kies een locatie</option>' +
        (locaties || []).map(locatie =>
            `<option value="${locatie.id}">${escapeHtml(locatie.name)}</option>`
        ).join("");

    // Bij locatiekeuze de bijbehorende speelpleinen ophalen
    locatieSelect.addEventListener("change", async () => {
        const locatieId = locatieSelect.value;

        pleinSelect.innerHTML = '<option value="">Pleinen laden...</option>';
        pleinSelect.disabled = true;

        if (!locatieId) {
            pleinSelect.innerHTML =
                '<option value="">Kies eerst een locatie</option>';
            return;
        }

        const { data: pleinen, error: pleinenFout } = await supabaseClient
            .from("courts")
            .select("id, name")
            .eq("venue_id", locatieId)
            .eq("is_active", true)
            .order("name");

        if (pleinenFout) {
            console.error("Speelpleinen laden mislukt:", pleinenFout.message);
            pleinSelect.innerHTML =
                '<option value="">Pleinen konden niet worden geladen</option>';
            return;
        }

        pleinSelect.innerHTML =
            '<option value="">Kies een speelplein</option>' +
            (pleinen || []).map(plein =>
                `<option value="${plein.id}">${escapeHtml(plein.name)}</option>`
            ).join("");

        pleinSelect.disabled = !pleinen || pleinen.length === 0;
    });
}

// HTML-tekens veilig weergeven
function escapeHtml(waarde) {
    return String(waarde ?? "").replace(/[&<>"']/g, teken => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[teken]);
}

// Een melding tonen bij het wedstrijdformulier
function toonWedstrijdMelding(bericht) {
    const melding = document.getElementById("wedstrijd-melding");

    if (!melding) {
        console.log(bericht);
        return;
    }

    melding.textContent = bericht;
    melding.classList.remove("hidden");
}

laadWedstrijdFormulier();
