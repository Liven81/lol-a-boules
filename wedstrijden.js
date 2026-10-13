const SUPABASE_URL = "https://uldmdrhrrniynbgecsby.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_aHpSMc2mXDJRM-FBvJ1GDA_gMByWSNY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const kalenderLijst = document.getElementById("kalender-lijst");


function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}


function formatDatum(datum) {
    return new Intl.DateTimeFormat("nl-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date(datum));
}


function formatUur(datum) {
    return new Intl.DateTimeFormat("nl-BE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Brussels"
    }).format(new Date(datum));
}


async function laadWedstrijdkalender() {
    kalenderLijst.innerHTML = `
        <p class="kalender-melding">
            De wedstrijdkalender wordt geladen...
        </p>
    `;

    try {
        // 1. Zoek de competitie van 2027.
        const { data: competitie, error: competitieFout } =
            await supabaseClient
                .from("competitions")
                .select("id")
                .eq("season_year", 2027)
                .limit(1)
                .maybeSingle();

        if (competitieFout) {
            throw competitieFout;
        }

        if (!competitie) {
            kalenderLijst.innerHTML = `
                <p class="kalender-melding">
                    De competitie van 2027 werd niet gevonden.
                </p>
            `;
            return;
        }

        // 2. Haal de wedstrijden met een datum en speelplein op.
        // We filteren bewust niet op status: de huidige
        // planningsfunctie laat status namelijk op "unscheduled" staan.
        const { data: wedstrijden, error: wedstrijdenFout } =
            await supabaseClient
                .from("matches")
                .select(`
                    id,
                    competition_id,
                    home_team_id,
                    away_team_id,
                    scheduled_at,
                    court_id,
                    public_welcome,
                    public_note
                `)
                .eq("competition_id", competitie.id)
                .not("scheduled_at", "is", null)
                .not("court_id", "is", null)
                .order("scheduled_at", { ascending: true });

        if (wedstrijdenFout) {
            throw wedstrijdenFout;
        }

        if (!wedstrijden || wedstrijden.length === 0) {
            kalenderLijst.innerHTML = `
                <p class="kalender-melding">
                    Er zijn momenteel nog geen wedstrijden ingepland.
                    Kom later zeker eens terug!
                </p>
            `;
            return;
        }

        // 3. Haal de ploegen, locaties en speelpleinen op.
        const [
            { data: teams, error: teamsFout },
            { data: terreinen, error: terreinenFout },
            { data: locaties, error: locatiesFout }
        ] = await Promise.all([
            supabaseClient
                .from("teams")
                .select("id, name")
                .eq("competition_id", competitie.id),

            supabaseClient
                .from("courts")
                .select("id, venue_id, name"),

            supabaseClient
                .from("venues")
                .select("id, name, address")
        ]);

        if (teamsFout) throw teamsFout;
        if (terreinenFout) throw terreinenFout;
        if (locatiesFout) throw locatiesFout;

        // 4. Maak opzoeklijsten om de IDs aan namen te koppelen.
        const teamsPerId = new Map(
            (teams || []).map(team => [team.id, team])
        );

        const terreinenPerId = new Map(
            (terreinen || []).map(terrein => [terrein.id, terrein])
        );

        const locatiesPerId = new Map(
            (locaties || []).map(locatie => [locatie.id, locatie])
        );

        // 5. Toon de wedstrijden.
        kalenderLijst.innerHTML = wedstrijden.map(wedstrijd => {
            const thuisploeg = teamsPerId.get(wedstrijd.home_team_id);
            const uitploeg = teamsPerId.get(wedstrijd.away_team_id);

            const terrein = terreinenPerId.get(wedstrijd.court_id);

            const locatie = terrein
                ? locatiesPerId.get(terrein.venue_id)
                : null;

            const datum = escapeHtml(formatDatum(wedstrijd.scheduled_at));
            const uur = escapeHtml(formatUur(wedstrijd.scheduled_at));

            const thuisNaam = escapeHtml(
                thuisploeg?.name || "Onbekende thuisploeg"
            );

            const uitNaam = escapeHtml(
                uitploeg?.name || "Onbekende uitploeg"
            );

            const terreinNaam = escapeHtml(
                terrein?.name || "Speelplein"
            );

            const locatieNaam = escapeHtml(
                locatie?.name || "Locatie niet beschikbaar"
            );

            const adres = locatie?.address
                ? `<br>${escapeHtml(locatie.address)}`
                : "";

            const welkom = wedstrijd.public_welcome
                ? `<p>${escapeHtml(wedstrijd.public_welcome)}</p>`
                : "";

            const opmerking = wedstrijd.public_note
                ? `<p>${escapeHtml(wedstrijd.public_note)}</p>`
                : "";

            return `
                <article class="kalender-wedstrijd">
                    <div class="kalender-datum">
                        ${datum} · ${uur} uur
                    </div>

                    <div class="kalender-ploegen">
                        <div class="kalender-ploeg">
                            ${thuisNaam}
                        </div>

                        <div class="kalender-tegen">VS</div>

                        <div class="kalender-ploeg">
                            ${uitNaam}
                        </div>
                    </div>

                    <div class="kalender-details">
                        <div>
                            <strong>Locatie:</strong>
                            ${locatieNaam}${adres}
                        </div>

                        <div>
                            <strong>Speelplein:</strong>
                            ${terreinNaam}
                        </div>

                        ${welkom}
                        ${opmerking}
                    </div>
                </article>
            `;
        }).join("");

    } catch (error) {
        console.error("Fout bij laden wedstrijdkalender:", error);

        kalenderLijst.innerHTML = `
            <p class="kalender-melding kalender-fout">
                De wedstrijdkalender kon niet worden geladen.
                Probeer het later opnieuw.
            </p>
        `;
    }
}


laadWedstrijdkalender();
