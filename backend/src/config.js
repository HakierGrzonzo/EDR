module.exports = {
    BASE_SIMRAIL_DISPATCH_API: "https://panel.simrail.eu:8091/",
    BASE_SIMRAIL_API: "https://panel.simrail.eu:8084/",
    srHeaders:{
        "User-Agent": "Custom EDR vDEV",
        "xx-client": "Custom EDR",
        "xx-maintainer": "DeadlyKungFu.Ninja",
        "xx-contact": "DeadlyKungFu.Ninja#8294",
        "xx-executor": "outbound.gcp.infra.deadlykungfu.ninja",
        "xx-message": "Beta access only for you, that monitor this network : https://edr.deadlykungfu.ninja/?betaToken=unjN6"
        //"xx-message": "Please dont ban this IP this is me developing stuff (not production server)"
    },
    SERVERS: ['fr1', 'fr2', 'cn1'],
    POSTS: {
        "Góra Włodowska": ["Góra Włodowska"],
        "Psary": ["Psary"],
        "Knapówka": ["Knapówka"],
        "Włoszczowa Północ": ["Włoszczowa Północ"],
        "Olszamowice": ["Olszamowice"],
        "Pilichowice": ["Pilichowice"],
        "Katowice_Zawodzie": ["Katowice_Zawodzie"],
        "Sosnowiec_Główny": ["Sosnowiec_Główny", "Sosnowiec_Gł._pzs_R52"],
        "Dąbrowa Górnicza": ["Dąbrowa Górnicza"],
        "Będzin": ["Będzin"],
        "Łazy Łc": ["Łazy Łc"]
    },
    vmax_by_type: {
        EIJ: 200,
        ECE: 125,
        MPE: 125,
        RPJ: 120,
        ROJ: 120,
        LTE: 125,
        TME: 80,
        TLE: 80,
        TCE: 85
    },
    translate_fields: {
        "K": "k",
        "NK": "nk",
        "Scheduled arrival": "scheduled_arrival",
        "+/-": "offset",
        "Real arrival": "real_arrival",
        "Type": "type",
        "Train no.": "train_number",
        "From post": "from",
        "To post": "to",
        "Track": "track",
        "Line no.": "line",
        "Layover": "layover",
        "Stop type": "stop_type",
        "P T": "platform",
        "Scheduled departure": "scheduled_departure",
        "Real departure": "real_departure",
        "Start station": "start_station",
        "Terminus station": "terminus_station",
        "Carrier": "carrier"
    }
}