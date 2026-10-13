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
    ],
    rules: [
        "Spelregels LOL CUP 2027",
        "Alle afspraken voor een eerlijke en sportieve competitie."
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

// Navigatieknoppen laten werken
document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        showView(button.dataset.view);
    });
});

// 2. Verbinding met Supabase
const SUPABASE_URL = "https://uldmdrhrrniynbgecsby.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aHpSMc2mXDJRM-FBvJ1GDA_gMByWSNY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// ========================================
// 3. Beheerderslogin en toegangscontrole
// ========================================

const adminButton = document.getElementById("adminButton");
const wedstrijdFormulierContainer =
    document.getElementById("wedstrijd-formulier-container");
const wedstrijdBeheerInfo =
    document.getElementById("wedstrijd-beheer-info");

let beheerderIngelogd = false;

// Controleren of de huidige gebruiker beheerder is
async function controleerBeheerder() {
    beheerderIngelogd = false;

    const { data: sessieData, error: sessieFout } =
        await supabaseClient.auth.getSession();

    if (sessieFout) {
        console.error("Sessie controleren mislukt:", sessieFout);
    }

    const sessie = sessieData?.session;

    if (sessie) {
        const { data: isBeheerder, error: beheerFout } =
            await supabaseClient.rpc("is_lol_cup_admin");

        if (beheerFout) {
            console.error("Beheerdersrechten controleren mislukt:", beheerFout);
        } else {
            beheerderIngelogd = isBeheerder === true;
        }
    }

    // Het wedstrijdformulier alleen tonen aan beheerders
    wedstrijdFormulierContainer?.classList.toggle(
        "hidden",
        !beheerderIngelogd
    );

    wedstrijdBeheerInfo?.classList.toggle(
        "hidden",
        beheerderIngelogd
    );

    adminButton.textContent = beheerderIngelogd
        ? "Uitloggen ↗"
        : "Beheerder ↗";

    return beheerderIngelogd;
}

// Bij het openen van de website de toegang controleren
controleerBeheerder();

// De knop bovenaan de website
adminButton.addEventListener("click", async () => {
    const heeftToegang = await controleerBeheerder();

    if (heeftToegang) {
        if (confirm("Wil je uitloggen uit het beheerdersgedeelte?")) {
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                alert("Uitloggen is mislukt.");
                console.error(error);
            } else {
                await controleerBeheerder();
                alert("Je bent uitgelogd.");
            }
        }

        return;
    }

    // Een bestaande login zonder beheerdersrechten opruimen
    const { data: sessieData } = await supabaseClient.auth.getSession();

    if (sessieData?.session) {
        await supabaseClient.auth.signOut();
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
// Teams ophalen en weergeven
// ========================================

async function laadTeams() {
const teamLijst = document.getElementById("team-lijst");


if (!teamLijst) {
    return;
}

try {
    teamLijst.innerHTML = '<p class="muted">De teams worden geladen...</p>';

    // De competitie van 2027 ophalen
    const { data: competities, error: competitieFout } =
        await supabaseClient
            .from("competitions")
            .select("id")
            .eq("season_year", 2027)
            .limit(1);

    console.log("Competities:", competities);
console.log("Competitie-fout:", competitieFout);

    if (competitieFout) {
        throw competitieFout;
    }

    if (!competities || competities.length === 0) {
        teamLijst.innerHTML =
            '<p class="muted">De competitie van 2027 is nog niet aangemaakt.</p>';
        return;
    }

    // De teams van deze competitie ophalen
    const { data: teams, error: teamsFout } =
        await supabaseClient
            .from("teams")
            .select("id, name")
            .eq("competition_id", competities[0].id)
            .order("name");

    if (teamsFout) {
        throw teamsFout;
    }

    if (!teams || teams.length === 0) {
        teamLijst.innerHTML = `
            <div class="empty">
                <div class="empty-icon">👥</div>
                <strong>De ploegen worden samengesteld!</strong>
                <p>Zodra de eerste teams geregistreerd zijn, verschijnen ze hier.</p>
            </div>
        `;
        return;
    }

    teamLijst.innerHTML = `
        <div class="team-grid">
            ${teams.map((team, index) => `
                <article class="team-kaart">
                    <div class="team-nummer">${String(index + 1).padStart(2, "0")}</div>
                    <div class="team-info">
                        <h3>${escapeHtml(team.name)}</h3>
                        <p>Deelnemer LOL CUP 2027</p>
                    </div>
                </article>
            `).join("")}
        </div>
    `;

} catch (fout) {
    console.error("Teams laden mislukt:", fout);

    teamLijst.innerHTML =
        '<p class="muted">De teams konden momenteel niet worden geladen.</p>';
}


}

laadTeams();



// ========================================
// Wedstrijdplanning: keuzelijsten laden
// ========================================

async function laadWedstrijdFormulier() {
    const thuisSelect = document.getElementById("thuisploeg");
    const uitSelect = document.getElementById("uitploeg");
    const locatieSelect = document.getElementById("wedstrijd-locatie");

    const datumInput = document.getElementById("wedstrijd-datum");
    const uurInput = document.getElementById("wedstrijd-uur");
    const beschikbaarheidInfo =
        document.getElementById("beschikbaarheid-info");

    if (
    !thuisSelect ||
    !uitSelect ||
    !locatieSelect ||
    !datumInput ||
    !uurInput
) {
    console.error("Wedstrijdformulier: een of meer velden ontbreken.");
    return;
}
    
    // Starturen instellen in stappen van 15 minuten
uurInput.innerHTML = '<option value="">Kies een startuur</option>';

for (let minuten = 8 * 60; minuten <= 22 * 60; minuten += 15) {
    const uren = String(Math.floor(minuten / 60)).padStart(2, "0");
    const resterendeMinuten = String(minuten % 60).padStart(2, "0");
    const tijd = `${uren}:${resterendeMinuten}`;

    const optie = document.createElement("option");
    optie.value = tijd;
    optie.textContent = tijd;

    uurInput.appendChild(optie);
}



    // Competitie ophalen
    const { data: competities, error: competitieFout } =
        await supabaseClient
            .from("competitions")
            .select("id, name")
            .eq("season_year", 2027)
            .limit(1);

    if (competitieFout || !competities || competities.length === 0) {
        console.error("Competitie laden mislukt:", competitieFout);
        toonWedstrijdMelding("De competitie kon niet worden geladen.");
        return;
    }

    const competitieId = competities[0].id;

    // Teams ophalen
    const { data: teams, error: teamsFout } =
        await supabaseClient
            .from("teams")
            .select("id, name")
            .eq("competition_id", competitieId)
            .eq("status", "approved")
            .order("name");

    if (teamsFout) {
        console.error("Teams laden mislukt:", teamsFout);
        toonWedstrijdMelding("De teams konden niet worden geladen.");
        return;
    }

    const teamOpties = (teams || [])
        .map(team =>
            `<option value="${team.id}">${escapeHtml(team.name)}</option>`
        )
        .join("");

    thuisSelect.innerHTML =
        '<option value="">Kies de thuisploeg</option>' + teamOpties;

    uitSelect.innerHTML =
        '<option value="">Kies de uitploeg</option>' + teamOpties;

    // Dezelfde ploeg mag niet twee keer gekozen worden
    function updateTeamKeuzes() {
        if (thuisSelect.value && thuisSelect.value === uitSelect.value) {
            uitSelect.value = "";
        }

        Array.from(uitSelect.options).forEach(optie => {
            optie.disabled =
                optie.value !== "" &&
                optie.value === thuisSelect.value;
        });

        Array.from(thuisSelect.options).forEach(optie => {
            optie.disabled =
                optie.value !== "" &&
                optie.value === uitSelect.value;
        });
    }

    thuisSelect.addEventListener("change", updateTeamKeuzes);
    uitSelect.addEventListener("change", updateTeamKeuzes);

    updateTeamKeuzes();

    // Actieve locaties ophalen
    const { data: locaties, error: locatiesFout } =
        await supabaseClient
            .from("venues")
            .select("id, name")
            .eq("is_active", true)
            .order("name");

    if (locatiesFout) {
        console.error("Locaties laden mislukt:", locatiesFout);
        toonWedstrijdMelding("De speellocaties konden niet worden geladen.");
        return;
    }

    locatieSelect.innerHTML =
        '<option value="">Kies een locatie</option>' +
        (locaties || [])
            .map(locatie =>
                `<option value="${locatie.id}">${escapeHtml(locatie.name)}</option>`
            )
            .join("");

    // Beschikbaarheid controleren wanneer locatie, datum of uur verandert
    async function controleerBeschikbaarheid() {
        if (!beschikbaarheidInfo) {
            return;
        }

        const locatieId = locatieSelect.value;
        const datum = datumInput.value;
        const uur = uurInput.value;

        if (!locatieId || !datum || !uur) {
            beschikbaarheidInfo.textContent =
                "Kies een locatie, datum en startuur om de beschikbaarheid te controleren.";
            return;
        }

        const startTijd = new Date(`${datum}T${uur}`);

        if (Number.isNaN(startTijd.getTime())) {
            beschikbaarheidInfo.textContent =
                "De gekozen datum of het startuur is ongeldig.";
            return;
        }

        if (startTijd <= new Date()) {
            beschikbaarheidInfo.textContent =
                "Kies een datum en startuur in de toekomst.";
            return;
        }

        beschikbaarheidInfo.textContent =
            "Beschikbaarheid controleren...";

        const { data, error } = await supabaseClient.rpc(
            "get_lol_cup_court_availability",
            {
                p_venue_id: locatieId,
                p_scheduled_at: startTijd.toISOString()
            }
        );

        if (error) {
            console.error("Beschikbaarheid controleren mislukt:", error);

            beschikbaarheidInfo.textContent =
                "De beschikbaarheid kon niet worden gecontroleerd. Probeer opnieuw.";
            return;
        }

        const totaal = Number(data?.total_courts);
        const beschikbaar = Number(data?.available_courts);

        if (!Number.isFinite(totaal) || !Number.isFinite(beschikbaar)) {
            beschikbaarheidInfo.textContent =
                "De beschikbaarheid kon niet worden bepaald.";
            return;
        }

        if (totaal === 0) {
            beschikbaarheidInfo.textContent =
                "Deze locatie heeft geen actieve speelpleinen.";
        } else if (beschikbaar === 0) {
            beschikbaarheidInfo.textContent =
                `Geen speelpleinen beschikbaar. Alle ${totaal} speelpleinen zijn bezet op dit tijdstip.`;
        } else {
            beschikbaarheidInfo.textContent =
                `Nog ${beschikbaar} van de ${totaal} speelpleinen beschikbaar op deze locatie.`;
        }
    }

    locatieSelect.addEventListener("change", controleerBeschikbaarheid);
    datumInput.addEventListener("change", controleerBeschikbaarheid);
    uurInput.addEventListener("change", controleerBeschikbaarheid);
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

document.getElementById("wedstrijd-form")?.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const formulier = document.getElementById("wedstrijd-form");
        const knop = document.getElementById("wedstrijd-opslaan");

        const thuisploeg = document.getElementById("thuisploeg").value;
        const uitploeg = document.getElementById("uitploeg").value;
        const datum = document.getElementById("wedstrijd-datum").value;
        const uur = document.getElementById("wedstrijd-uur").value;
        const locatie = document.getElementById("wedstrijd-locatie").value;

        const melding = document.getElementById("wedstrijd-melding");
        const beschikbaarheidInfo =
            document.getElementById("beschikbaarheid-info");

        melding.textContent = "";
        melding.classList.add("hidden");

        if (
            !thuisploeg ||
            !uitploeg ||
            !datum ||
            !uur ||
            !locatie
        ) {
            toonWedstrijdMelding(
                "Vul alle gegevens in voordat je de wedstrijd plant."
            );
            return;
        }

        if (thuisploeg === uitploeg) {
            toonWedstrijdMelding(
                "Een ploeg kan niet tegen zichzelf spelen. Kies twee verschillende ploegen."
            );
            return;
        }

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

        knop.disabled = true;
        knop.textContent = "Wedstrijd opslaan...";

        try {
            // Extra controle op de beheerdersrechten
            const heeftToegang = await controleerBeheerder();

            if (!heeftToegang) {
                throw new Error(
                    "Je moet ingelogd zijn als LOL CUP-beheerder om wedstrijden te plannen."
                );
            }

            // Beschikbaarheid opnieuw controleren voor een duidelijke melding
            const { data: beschikbaarheid, error: beschikbaarheidFout } =
                await supabaseClient.rpc(
                    "get_lol_cup_court_availability",
                    {
                        p_venue_id: locatie,
                        p_scheduled_at: startTijd.toISOString()
                    }
                );

            if (beschikbaarheidFout) {
                throw beschikbaarheidFout;
            }

            if (
                !beschikbaarheid ||
                Number(beschikbaarheid.available_courts) <= 0
            ) {
                throw new Error(
                    "Geen speelpleinen beschikbaar op deze locatie en dit tijdstip. Kies een ander uur of een andere locatie."
                );
            }

            // De database kiest zelf een vrij speelplein en slaat de wedstrijd op
            const { data: resultaat, error: opslaanFout } =
                await supabaseClient.rpc(
                    "plan_lol_cup_match",
                    {
                        p_home_team_id: thuisploeg,
                        p_away_team_id: uitploeg,
                        p_scheduled_at: startTijd.toISOString(),
                        p_venue_id: locatie
                    }
                );

            if (opslaanFout) {
                throw opslaanFout;
            }

            const resterend = Number(resultaat?.available_courts);

            toonWedstrijdMelding(
                "De wedstrijd is succesvol gepland! " +
                (
                    Number.isFinite(resterend)
                        ? `Er zijn na deze reservatie nog ${resterend} speelpleinen beschikbaar op deze locatie.`
                        : "Een vrij speelplein werd automatisch toegewezen."
                )
            );

            formulier.reset();

            if (beschikbaarheidInfo) {
                beschikbaarheidInfo.textContent =
                    "Kies een locatie, datum en startuur om de beschikbaarheid te controleren.";
            }

        } catch (fout) {
            console.error("Wedstrijd opslaan mislukt:", fout);

            let bericht = "De wedstrijd kon niet worden opgeslagen.";

            if (fout.message) {
                bericht = fout.message;
            }

            toonWedstrijdMelding(bericht);

        } finally {
            knop.disabled = false;
            knop.textContent = "Wedstrijd plannen";
        }
    }
);

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
    const wachtwoord =
        document.getElementById("login-wachtwoord").value;

    loginKnop.disabled = true;
    loginKnop.textContent = "Even wachten...";

    loginMelding.classList.add("hidden");
    loginMelding.textContent = "";

    try {
        const { error: loginFout } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: wachtwoord
            });

        if (loginFout) {
            throw loginFout;
        }

        // Controleren of dit account ook echt beheerder is
        const heeftToegang = await controleerBeheerder();

        if (!heeftToegang) {
            await supabaseClient.auth.signOut();
            await controleerBeheerder();

            throw new Error("GEEN_BEHEERDERSRECHTEN");
        }

        loginVenster.classList.add("hidden");
        loginFormulier.reset();

        alert("Welkom! Je bent ingelogd als LOL CUP-beheerder.");

    } catch (error) {
        console.error("Inloggen mislukt:", error);

        if (error.message === "GEEN_BEHEERDERSRECHTEN") {
            loginMelding.textContent =
                "Je account heeft geen beheerdersrechten voor LOL CUP.";
        } else {
            loginMelding.textContent =
                "Inloggen mislukt. Controleer je e-mailadres en wachtwoord.";
        }

        loginMelding.classList.remove("hidden");

    } finally {
        loginKnop.disabled = false;
        loginKnop.textContent = "Inloggen";
    }
});
