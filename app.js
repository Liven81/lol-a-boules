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
    locaties: [
        "Onze speellocaties",
        "Ontdek onze pleinen en ontmoetingsplaatsen."
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

const sectionTitle = document.getElementById("sectionTitle");
const sectionSubtitle = document.getElementById("sectionSubtitle");

if (sectionTitle) {
    sectionTitle.textContent = views[selected][0];
}

if (sectionSubtitle) {
    sectionSubtitle.textContent = views[selected][1];
}

}


// 2. Verbinding met Supabase
const SUPABASE_URL = "https://uldmdrhrrniynbgecsby.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aHpSMc2mXDJRM-FBvJ1GDA_gMByWSNY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// 3. Beheerdersknop
document.getElementById("adminButton").addEventListener("click", async () => {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        const bevestigen = confirm(
            "Je bent ingelogd. Wil je uitloggen?"
        );

        if (bevestigen) {
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                alert("Uitloggen is mislukt.");
                console.error(error);
            } else {
                alert("Je bent uitgelogd.");
            }
        }

        return;
    }

    document.getElementById("login-venster").classList.remove("hidden");
    document.getElementById("login-email").focus();
});

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

// ========================================
// Wedstrijd opslaan
// ========================================

document.getElementById("wedstrijd-form")?.addEventListener("submit", async function (event) {
    event.preventDefault();

    const knop = document.getElementById("wedstrijd-opslaan");
    const melding = document.getElementById("wedstrijd-melding");

    const thuisploeg = document.getElementById("thuisploeg").value;
    const uitploeg = document.getElementById("uitploeg").value;
    const datum = document.getElementById("wedstrijd-datum").value;
    const uur = document.getElementById("wedstrijd-uur").value;
    const locatie = document.getElementById("wedstrijd-locatie").value;
    const plein = document.getElementById("wedstrijd-plein").value;

    // Oude melding wissen
    melding.textContent = "";
    melding.classList.add("hidden");

    // Controleren of beide ploegen verschillend zijn
    if (thuisploeg === uitploeg) {
        toonWedstrijdMelding(
            "Een ploeg kan niet tegen zichzelf spelen. Kies twee verschillende ploegen."
        );
        return;
    }

    // Controleren of alle gegevens ingevuld zijn
    if (!thuisploeg || !uitploeg || !datum || !uur || !locatie || !plein) {
        toonWedstrijdMelding(
            "Vul alle gegevens in voordat je de wedstrijd plant."
        );
        return;
    }

    // Datum en uur omzetten naar een tijdstip
    const startTijd = new Date(`${datum}T${uur}`);

    if (Number.isNaN(startTijd.getTime())) {
        toonWedstrijdMelding("De datum of het startuur is ongeldig.");
        return;
    }

    if (startTijd <= new Date()) {
        toonWedstrijdMelding(
            "Kies een datum en startuur in de toekomst."
        );
        return;
    }

    // Knop tijdelijk uitschakelen om dubbel klikken te voorkomen
    knop.disabled = true;
    knop.textContent = "Wedstrijd opslaan...";

    try {
        // De competitie ophalen
        const { data: competities, error: competitieFout } =
            await supabaseClient
                .from("competitions")
                .select("id")
                .eq("season_year", 2027)
                .limit(1);

        if (competitieFout) {
            throw competitieFout;
        }

        if (!competities || competities.length === 0) {
            throw new Error("De competitie van 2027 werd niet gevonden.");
        }

        // De wedstrijd opslaan
        const { error: opslaanFout } = await supabaseClient
            .from("matches")
            .insert({
                competition_id: competities[0].id,
                home_team_id: thuisploeg,
                away_team_id: uitploeg,
                scheduled_at: startTijd.toISOString(),
                court_id: plein
            });

        if (opslaanFout) {
            throw opslaanFout;
        }

        // Gelukt!
        toonWedstrijdMelding(
            "De wedstrijd is succesvol gepland! Je kunt hieronder een nieuwe wedstrijd plannen."
        );

        // Het formulier leegmaken
        document.getElementById("wedstrijd-form").reset();

        // Speelplein opnieuw uitschakelen tot er een locatie gekozen is
        const pleinSelect = document.getElementById("wedstrijd-plein");
        pleinSelect.innerHTML =
            '<option value="">Kies eerst een locatie</option>';
        pleinSelect.disabled = true;

    } catch (fout) {
        console.error("Wedstrijd opslaan mislukt:", fout);

        let bericht = "De wedstrijd kon niet worden opgeslagen.";

        if (
            fout.message &&
            fout.message.includes("Dit speelplein is op dat tijdstip al gereserveerd")
        ) {
            bericht =
                "Dit speelplein is op dat tijdstip al gereserveerd. Kies een ander plein of tijdstip.";
        } else if (fout.message) {
            bericht += " Details: " + fout.message;
        }

        toonWedstrijdMelding(bericht);

    } finally {
        knop.disabled = false;
        knop.textContent = "Wedstrijd plannen";
    }
});

// ========================================
// Beheerderslogin via Supabase
// ========================================

const loginVenster = document.getElementById("login-venster");
const loginFormulier = document.getElementById("login-formulier");
const loginMelding = document.getElementById("login-melding");
const loginKnop = document.getElementById("login-knop");

// Loginvenster sluiten
document.getElementById("login-sluiten").addEventListener("click", () => {
    loginVenster.classList.add("hidden");
    loginMelding.textContent = "";
    loginMelding.classList.add("hidden");
});

// Ook sluiten door buiten het venster te klikken
loginVenster.addEventListener("click", (event) => {
    if (event.target === loginVenster) {
        loginVenster.classList.add("hidden");
    }
});

// Inloggen
loginFormulier.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const wachtwoord = document.getElementById("login-wachtwoord").value;

    loginKnop.disabled = true;
    loginKnop.textContent = "Even wachten...";

    loginMelding.classList.add("hidden");
    loginMelding.textContent = "";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: wachtwoord
        });

        if (error) {
            throw error;
        }

        if (!data.session) {
            throw new Error("Er kon geen actieve sessie worden gestart.");
        }

        loginVenster.classList.add("hidden");
        loginFormulier.reset();

        alert("Je bent succesvol ingelogd!");

    } catch (error) {
        console.error("Inloggen mislukt:", error);

        loginMelding.textContent =
            "Inloggen mislukt. Controleer je e-mailadres en wachtwoord.";

        loginMelding.classList.remove("hidden");

    } finally {
        loginKnop.disabled = false;
        loginKnop.textContent = "Inloggen";
    }
});
