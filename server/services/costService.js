// ─────────────────────────────────────────────────────────────────────────────
// costService.js  —  Smart TSRTC Bus Routing + Full Metro Routing for Hyderabad
// ─────────────────────────────────────────────────────────────────────────────

const MAX_METRO_WALK_KM = 2.0;

const BUS_STOPS = [
  { name:"L.B. Nagar X Road",         lat:17.3469, lon:78.5526 },
  { name:"L.B. Nagar Bus Stop",        lat:17.3453, lon:78.5511 },
  { name:"Vanasthali Puram",           lat:17.3520, lon:78.5620 },
  { name:"Kothapet Bus Stop",          lat:17.3618, lon:78.5392 },
  { name:"Chaitanyapuri X Road",       lat:17.3663, lon:78.5312 },
  { name:"Dilsukhnagar Bus Stop",      lat:17.3687, lon:78.5268 },
  { name:"Moosarambagh Bus Stop",      lat:17.3842, lon:78.5094 },
  { name:"Malakpet X Road",            lat:17.3880, lon:78.4980 },
  { name:"New Malakpet",               lat:17.3860, lon:78.5010 },
  { name:"Nalgonda X Road",            lat:17.3850, lon:78.5050 },
  { name:"Chaderghat Bus Stop",        lat:17.3806, lon:78.4780 },
  { name:"MGBS",                       lat:17.3784, lon:78.4820 },
  { name:"Afzalgunj Bus Stop",         lat:17.3820, lon:78.4734 },
  { name:"Koti Bus Stop",              lat:17.3912, lon:78.4796 },
  { name:"Mozamjahi Market",           lat:17.3930, lon:78.4750 },
  { name:"Abids Bus Stop",             lat:17.3924, lon:78.4746 },
  { name:"Nampally Station",           lat:17.3934, lon:78.4667 },
  { name:"Nampally Public Garden",     lat:17.3945, lon:78.4648 },
  { name:"Narayanguda Bus Stop",       lat:17.3962, lon:78.4873 },
  { name:"Himayatnagar Bus Stop",      lat:17.4028, lon:78.4797 },
  { name:"Lakdikapul Bus Stop",        lat:17.4045, lon:78.4613 },
  { name:"NIMS Bus Stop",              lat:17.4089, lon:78.4562 },
  { name:"Erramanzil Bus Stop",        lat:17.4165, lon:78.4514 },
  { name:"Khairatabad Bus Stop",       lat:17.4220, lon:78.4537 },
  { name:"Somajiguda Bus Stop",        lat:17.4268, lon:78.4556 },
  { name:"Punjagutta Bus Stop",        lat:17.4247, lon:78.4479 },
  { name:"Greenlands Bus Stop",        lat:17.4310, lon:78.4431 },
  { name:"Banjara Hills Bus Stop",     lat:17.4267, lon:78.4380 },
  { name:"Moti Nagar Bus Stop",        lat:17.4480, lon:78.4281 },
  { name:"Ameerpet Bus Stop",          lat:17.4374, lon:78.4487 },
  { name:"RTC X Roads Bus Stop",       lat:17.4259, lon:78.5003 },
  { name:"Musheerabad Bus Stop",       lat:17.4304, lon:78.5054 },
  { name:"Begumpet Bus Stop",          lat:17.4413, lon:78.4728 },
  { name:"Paradise Bus Stop",          lat:17.4455, lon:78.4973 },
  { name:"Secunderabad Bus Station",   lat:17.4384, lon:78.4991 },
  { name:"SR Nagar Bus Stop",          lat:17.4501, lon:78.4402 },
  { name:"Erragadda Bus Stop",         lat:17.4591, lon:78.4325 },
  { name:"Kukatpally Bus Stop",        lat:17.4848, lon:78.4138 },
  { name:"Kukatpally Y Junction",      lat:17.4872, lon:78.4102 },
  { name:"KPHB Colony Bus Stop",       lat:17.4934, lon:78.3974 },
  { name:"JNTU Bus Stop",              lat:17.4935, lon:78.3918 },
  { name:"Miyapur Bus Stop",           lat:17.4968, lon:78.3726 },
  { name:"Madinaguda Bus Stop",        lat:17.4936, lon:78.3542 },
  { name:"BHEL Pushpak",               lat:17.5024, lon:78.3564 },
  { name:"Balanagar Bus Stop",         lat:17.4697, lon:78.4288 },
  { name:"Moosapet Bus Stop",          lat:17.4628, lon:78.4363 },
  { name:"Bharat Nagar Bus Stop",      lat:17.4572, lon:78.4308 },
  { name:"ESI Hospital Bus Stop",      lat:17.4519, lon:78.4357 },
  { name:"Hitech City Bus Stop",       lat:17.4436, lon:78.3759 },
  { name:"Madhapur Bus Stop",          lat:17.4484, lon:78.3933 },
  { name:"Jubilee Hills Check Post",   lat:17.4284, lon:78.4099 },
  { name:"Road No.36 Jubilee Hills",   lat:17.4243, lon:78.4090 },
  { name:"Kondapur Bus Stop",          lat:17.4668, lon:78.3617 },
  { name:"Biodiversity Complex",       lat:17.4463, lon:78.3833 },
  { name:"Nanakramguda Bus Stop",      lat:17.4350, lon:78.3731 },
  { name:"Gachibowli Bus Stop",        lat:17.4435, lon:78.3673 },
  { name:"Financial District",         lat:17.4237, lon:78.3459 },
  { name:"Wipro Circle",               lat:17.4101, lon:78.3593 },
  { name:"Mehdipatnam Bus Stop",       lat:17.3961, lon:78.4370 },
  { name:"Tolichowki Bus Stop",        lat:17.4075, lon:78.4145 },
  { name:"Attapur Bus Stop",           lat:17.3720, lon:78.4264 },
  { name:"Rajendranagar Bus Stop",     lat:17.3277, lon:78.4337 },
  { name:"Uppal Bus Stop",             lat:17.4052, lon:78.5589 },
  { name:"Nagole Bus Stop",            lat:17.3952, lon:78.5545 },
  { name:"Habsiguda Bus Stop",         lat:17.4082, lon:78.5527 },
  { name:"ECIL X Roads Bus Stop",      lat:17.4691, lon:78.5617 },
  { name:"Tarnaka Bus Stop",           lat:17.4250, lon:78.5338 },
  { name:"Mettuguda Bus Stop",         lat:17.4258, lon:78.5345 },
  { name:"Sainikpuri Bus Stop",        lat:17.4864, lon:78.5508 },
  { name:"Infosys Bus Stop",           lat:17.4450, lon:78.3522 },
  { name:"WaveRock Bus Stop",          lat:17.4371, lon:78.3572 },
];

const TSRTC_BUS_CORRIDORS = [
  { busNo:"156H/217", corridor:"LB Nagar → Biodiversity Complex → Hitech City → Gachibowli", fromZone:"se",      toZone:"west",     stops:41, freq:"every 20 min", fare:80 },
  { busNo:"195W",     corridor:"Biodiversity Complex → WaveRock → Gachibowli → Financial District", fromZone:"west_mid", toZone:"west_far", stops:6, freq:"every 15 min", fare:20 },
  { busNo:"113M/W",   corridor:"Madhapur → Gachibowli → Financial District",                  fromZone:"west_mid", toZone:"west_far", stops:8,  freq:"every 15 min", fare:20 },
  { busNo:"216/220K", corridor:"LB Nagar → Madhapur → Hitech City",                           fromZone:"se",      toZone:"west",     stops:28, freq:"every 25 min", fare:65 },
  { busNo:"218H",     corridor:"LB Nagar → Dilsukhnagar → Malakpet → Nampally → Punjagutta → Ameerpet", fromZone:"se", toZone:"central", stops:30, freq:"every 15 min", fare:45 },
  { busNo:"156F",     corridor:"LB Nagar → Dilsukhnagar → Koti → Abids → Punjagutta",        fromZone:"se",      toZone:"central",  stops:22, freq:"every 12 min", fare:38 },
  { busNo:"277D",     corridor:"LB Nagar → Kothapet → Dilsukhnagar → Koti → Nampally → Punjagutta", fromZone:"se", toZone:"central", stops:28, freq:"every 20 min", fare:35 },
  { busNo:"290U",     corridor:"LB Nagar → MGBS → RTC X Roads → Ameerpet",                   fromZone:"se",      toZone:"central",  stops:20, freq:"every 25 min", fare:40 },
  { busNo:"49M",      corridor:"LB Nagar → Koti → Lakdikapul → Ameerpet",                    fromZone:"se",      toZone:"central",  stops:18, freq:"every 10 min", fare:30 },
  { busNo:"127K",     corridor:"Ameerpet → Greenlands → Banjara Hills",                       fromZone:"central", toZone:"banjara",  stops:5,  freq:"every 12 min", fare:15 },
  { busNo:"49M",      corridor:"Ameerpet → Banjara Hills → Mehdipatnam",                      fromZone:"central", toZone:"sw",       stops:8,  freq:"every 15 min", fare:20 },
  { busNo:"5",        corridor:"Secunderabad → Begumpet → Ameerpet → Mehdipatnam",            fromZone:"north",   toZone:"sw",       stops:12, freq:"every 8 min",  fare:25 },
  { busNo:"65F",      corridor:"Secunderabad → Begumpet → Ameerpet → Hitech City",            fromZone:"north",   toZone:"west",     stops:15, freq:"every 15 min", fare:30 },
  { busNo:"218K",     corridor:"Uppal → Habsiguda → Tarnaka → Secunderabad → Ameerpet",       fromZone:"east",    toZone:"central",  stops:14, freq:"every 15 min", fare:28 },
  { busNo:"217E",     corridor:"Kukatpally → Balanagar → Ameerpet → Hitech City",             fromZone:"nw",      toZone:"west",     stops:13, freq:"every 10 min", fare:28 },
  { busNo:"10B",      corridor:"Kukatpally → JNTU → Miyapur → BHEL → Hitech City",           fromZone:"nw",      toZone:"west",     stops:8,  freq:"every 15 min", fare:22 },
  { busNo:"115K",     corridor:"Kukatpally → KPHB → Miyapur → Kondapur → Hitech City",       fromZone:"nw",      toZone:"west",     stops:7,  freq:"every 20 min", fare:20 },
  { busNo:"9X/272",   corridor:"Dilsukhnagar → Malakpet → Koti → Nampally → Ameerpet",       fromZone:"se",      toZone:"central",  stops:9,  freq:"every 5 min",  fare:22 },
  { busNo:"1",        corridor:"MGBS → Abids → Koti → Begumpet → Secunderabad",              fromZone:"central", toZone:"north",    stops:9,  freq:"every 5 min",  fare:18 },
];

const METRO_STATIONS = {
  red: [
    { name:"Miyapur",                 lat:17.4969, lon:78.3541 },
    { name:"JNTU College",            lat:17.4950, lon:78.3628 },
    { name:"KPHB Colony",             lat:17.4924, lon:78.3726 },
    { name:"Kukatpally",              lat:17.4849, lon:78.3940 },
    { name:"Balanagar",               lat:17.4762, lon:78.4148 },
    { name:"Moosapet",                lat:17.4680, lon:78.4263 },
    { name:"Bharat Nagar",            lat:17.4607, lon:78.4345 },
    { name:"Erragadda",               lat:17.4540, lon:78.4400 },
    { name:"ESI Hospital",            lat:17.4476, lon:78.4433 },
    { name:"SR Nagar",                lat:17.4414, lon:78.4466 },
    { name:"Ameerpet",                lat:17.4374, lon:78.4487 },
    { name:"Punjagutta",              lat:17.4318, lon:78.4496 },
    { name:"Irrum Manzil",            lat:17.4261, lon:78.4502 },
    { name:"Khairatabad",             lat:17.4211, lon:78.4515 },
    { name:"Lakdi-Ka-Pul",            lat:17.4160, lon:78.4540 },
    { name:"Assembly",                lat:17.4084, lon:78.4614 },
    { name:"Nampally",                lat:17.4006, lon:78.4687 },
    { name:"Gandhi Bhavan",           lat:17.3950, lon:78.4728 },
    { name:"Osmania Medical College", lat:17.3888, lon:78.4754 },
    { name:"MG Bus Station",          lat:17.3784, lon:78.4803 },
    { name:"Malakpet",                lat:17.3668, lon:78.4883 },
    { name:"New Market",              lat:17.3589, lon:78.4954 },
    { name:"Musarambagh",             lat:17.3503, lon:78.5014 },
    { name:"Dilsukhnagar",            lat:17.3680, lon:78.5260 },
    { name:"Chaitanyapuri",           lat:17.3590, lon:78.5338 },
    { name:"Victoria Memorial",       lat:17.3500, lon:78.5398 },
    { name:"LB Nagar",                lat:17.3463, lon:78.5538 },
  ],
  blue: [
    { name:"Nagole",                        lat:17.3952, lon:78.5545 },
    { name:"Uppal",                         lat:17.4052, lon:78.5589 },
    { name:"Stadium",                       lat:17.4074, lon:78.5424 },
    { name:"NGRI",                          lat:17.4125, lon:78.5345 },
    { name:"Habsiguda",                     lat:17.4182, lon:78.5302 },
    { name:"Tarnaka",                       lat:17.4250, lon:78.5338 },
    { name:"Mettuguda",                     lat:17.4275, lon:78.5230 },
    { name:"Secunderabad East",             lat:17.4345, lon:78.5094 },
    { name:"Parade Ground",                 lat:17.4380, lon:78.4991 },
    { name:"Paradise",                      lat:17.4455, lon:78.4973 },
    { name:"Rasoolpura",                    lat:17.4490, lon:78.4878 },
    { name:"Prakash Nagar",                 lat:17.4523, lon:78.4810 },
    { name:"Begumpet",                      lat:17.4440, lon:78.4624 },
    { name:"Ameerpet",                      lat:17.4374, lon:78.4487 },
    { name:"Madhura Nagar",                 lat:17.4322, lon:78.4214 },
    { name:"Yusufguda",                     lat:17.4310, lon:78.4078 },
    { name:"Banjara Hills Road No.12",      lat:17.4248, lon:78.3991 },
    { name:"Jubilee Hills Road No.5",       lat:17.4219, lon:78.3874 },
    { name:"Jubilee Hills Check Post",      lat:17.4301, lon:78.3803 },
    { name:"Peddamma Temple",               lat:17.4387, lon:78.3741 },
    { name:"Madhapur",                      lat:17.4472, lon:78.3900 },
    { name:"Durgam Cheruvu",               lat:17.4483, lon:78.3801 },
    { name:"Hi-Tech City",                  lat:17.4474, lon:78.3744 },
    { name:"Raidurg",                       lat:17.4388, lon:78.3564 },
  ],
  green: [
    { name:"JBS Parade Ground",   lat:17.4436, lon:78.4980 },
    { name:"Secunderabad West",   lat:17.4380, lon:78.4896 },
    { name:"Gandhi Hospital",     lat:17.4318, lon:78.4840 },
    { name:"Musheerabad",         lat:17.4256, lon:78.4817 },
    { name:"RTC X Roads",         lat:17.4170, lon:78.4773 },
    { name:"Chikkadpally",        lat:17.4047, lon:78.4973 },
    { name:"Narayanguda",         lat:17.3953, lon:78.4895 },
    { name:"Sultan Bazar",        lat:17.3871, lon:78.4808 },
    { name:"MG Bus Station",      lat:17.3784, lon:78.4803 },
  ],
};

const METRO_INTERCHANGES = [
  { name:"Ameerpet",        lines:["red",  "blue"]  },
  { name:"MG Bus Station",  lines:["red",  "green"] },
];

const BLUE_GREEN_INTERCHANGE = {
  blueName:  "Parade Ground",
  greenName: "JBS Parade Ground",
};

const ALL_STATION_NAMES = [
  ...METRO_STATIONS.red.map(s => s.name),
  ...METRO_STATIONS.blue.map(s => s.name),
  ...METRO_STATIONS.green.map(s => s.name),
];

const METRO_NAME_ALIASES = {
  // ── Red Line ──
  "lb nagar":                               "LB Nagar",
  "l.b. nagar":                             "LB Nagar",
  "lbnagar":                                "LB Nagar",
  "l.b nagar":                              "LB Nagar",
  "lb nagar metro":                         "LB Nagar",
  "lb nagar metro station":                 "LB Nagar",
  "lb nagar station":                       "LB Nagar",
  "lbnagar metro station":                  "LB Nagar",
  "l.b. nagar metro station":               "LB Nagar",
  "l.b nagar metro station":                "LB Nagar",
  "lb nagar hyderabad metro":               "LB Nagar",
  "lb nagar hyderabad metro station":       "LB Nagar",
  "lb nagar metro rail":                    "LB Nagar",
  "lb nagar metro rail station":            "LB Nagar",
  "l.b. nagar metro":                       "LB Nagar",
  "victoria memorial":                      "Victoria Memorial",
  "victoria memorial metro":                "Victoria Memorial",
  "victoria memorial metro station":        "Victoria Memorial",
  "chaitanyapuri":                          "Chaitanyapuri",
  "chaitanyapuri metro":                    "Chaitanyapuri",
  "chaitanyapuri metro station":            "Chaitanyapuri",
  "dilsukhnagar":                           "Dilsukhnagar",
  "dilsukhnagar metro":                     "Dilsukhnagar",
  "dilsukhnagar metro station":             "Dilsukhnagar",
  "musarambagh":                            "Musarambagh",
  "musarambagh metro station":              "Musarambagh",
  "new market":                             "New Market",
  "new market metro station":               "New Market",
  "malakpet":                               "Malakpet",
  "malakpet metro station":                 "Malakpet",
  "mg bus station":                         "MG Bus Station",
  "mgbs":                                   "MG Bus Station",
  "mahatma gandhi bus station":             "MG Bus Station",
  "mg bus station metro":                   "MG Bus Station",
  "mg bus station metro station":           "MG Bus Station",
  "osmania medical college":                "Osmania Medical College",
  "omc":                                    "Osmania Medical College",
  "osmania medical college metro":          "Osmania Medical College",
  "osmania medical college metro station":  "Osmania Medical College",
  "gandhi bhavan":                          "Gandhi Bhavan",
  "gandhi bhavan metro station":            "Gandhi Bhavan",
  "nampally":                               "Nampally",
  "nampally metro":                         "Nampally",
  "nampally metro station":                 "Nampally",
  "assembly":                               "Assembly",
  "assembly metro station":                 "Assembly",
  "lakdi-ka-pul":                           "Lakdi-Ka-Pul",
  "lakdikapul":                             "Lakdi-Ka-Pul",
  "lakdi ka pul":                           "Lakdi-Ka-Pul",
  "lakdi-ka-pul metro station":             "Lakdi-Ka-Pul",
  "lakdi ka pul metro station":             "Lakdi-Ka-Pul",
  "khairatabad":                            "Khairatabad",
  "khairatabad metro station":              "Khairatabad",
  "irrum manzil":                           "Irrum Manzil",
  "irrummanzil":                            "Irrum Manzil",
  "irrum manzil metro station":             "Irrum Manzil",
  "punjagutta":                             "Punjagutta",
  "panjagutta":                             "Punjagutta",
  "punjaguta":                              "Punjagutta",
  "punjagutta metro":                       "Punjagutta",
  "punjagutta metro station":               "Punjagutta",
  "ameerpet":                               "Ameerpet",
  "ameerpet metro":                         "Ameerpet",
  "ameerpet metro station":                 "Ameerpet",
  "sr nagar":                               "SR Nagar",
  "srnagar":                                "SR Nagar",
  "sr nagar metro station":                 "SR Nagar",
  "esi hospital":                           "ESI Hospital",
  "esi hospital metro station":             "ESI Hospital",
  "erragadda":                              "Erragadda",
  "erragadda metro station":                "Erragadda",
  "bharat nagar":                           "Bharat Nagar",
  "bharat nagar metro station":             "Bharat Nagar",
  "moosapet":                               "Moosapet",
  "moosapet metro station":                 "Moosapet",
  "balanagar":                              "Balanagar",
  "balanagar metro station":                "Balanagar",
  "kukatpally":                             "Kukatpally",
  "kukatpally metro":                       "Kukatpally",
  "kukatpally metro station":               "Kukatpally",
  "kphb colony":                            "KPHB Colony",
  "kphb":                                   "KPHB Colony",
  "kphb colony metro station":              "KPHB Colony",
  "jntu college":                           "JNTU College",
  "jntu":                                   "JNTU College",
  "jntu college metro station":             "JNTU College",
  "miyapur":                                "Miyapur",
  "miyapur metro":                          "Miyapur",
  "miyapur metro station":                  "Miyapur",
  // ── Blue Line ──
  "nagole":                                 "Nagole",
  "nagole metro station":                   "Nagole",
  "uppal":                                  "Uppal",
  "uppal metro station":                    "Uppal",
  "stadium":                                "Stadium",
  "stadium metro station":                  "Stadium",
  "ngri":                                   "NGRI",
  "ngri metro station":                     "NGRI",
  "habsiguda":                              "Habsiguda",
  "habsiguda metro station":                "Habsiguda",
  "tarnaka":                                "Tarnaka",
  "tarnaka metro station":                  "Tarnaka",
  "mettuguda":                              "Mettuguda",
  "mettuguda metro station":                "Mettuguda",
  "secunderabad east":                      "Secunderabad East",
  "secunderabad east metro station":        "Secunderabad East",
  "parade ground":                          "Parade Ground",
  "parade ground metro station":            "Parade Ground",
  "paradise":                               "Paradise",
  "paradise metro station":                 "Paradise",
  "rasoolpura":                             "Rasoolpura",
  "rasoolpura metro station":               "Rasoolpura",
  "prakash nagar":                          "Prakash Nagar",
  "prakash nagar metro station":            "Prakash Nagar",
  "begumpet":                               "Begumpet",
  "begumpet metro":                         "Begumpet",
  "begumpet metro station":                 "Begumpet",
  "madhura nagar":                          "Madhura Nagar",
  "madhura nagar metro station":            "Madhura Nagar",
  "yusufguda":                              "Yusufguda",
  "yusufguda metro station":                "Yusufguda",
  "banjara hills road no.12":               "Banjara Hills Road No.12",
  "banjara hills":                          "Banjara Hills Road No.12",
  "banjara hills metro station":            "Banjara Hills Road No.12",
  "jubilee hills road no.5":                "Jubilee Hills Road No.5",
  "jubilee hills road no.5 metro station":  "Jubilee Hills Road No.5",
  "jubilee hills check post":               "Jubilee Hills Check Post",
  "jubilee hills":                          "Jubilee Hills Check Post",
  "jubilee hills check post metro station": "Jubilee Hills Check Post",
  "peddamma temple":                        "Peddamma Temple",
  "peddamma gudi":                          "Peddamma Temple",
  "peddamma temple metro station":          "Peddamma Temple",
  "madhapur":                               "Madhapur",
  "madhapur metro":                         "Madhapur",
  "madhapur metro station":                 "Madhapur",
  "durgam cheruvu":                         "Durgam Cheruvu",
  "durgam cheruvu metro station":           "Durgam Cheruvu",
  "hi-tech city":                           "Hi-Tech City",
  "hitech city":                            "Hi-Tech City",
  "hitec city":                             "Hi-Tech City",
  "hi tech city":                           "Hi-Tech City",
  "hi-tech city metro station":             "Hi-Tech City",
  "hitech city metro station":              "Hi-Tech City",
  "hi tech city metro station":             "Hi-Tech City",
  "raidurg":                                "Raidurg",
  "raidurg metro station":                  "Raidurg",
  // ── Green Line ──
  "jbs parade ground":                      "JBS Parade Ground",
  "jbs":                                    "JBS Parade Ground",
  "parade grounds":                         "JBS Parade Ground",
  "jbs parade ground metro station":        "JBS Parade Ground",
  "secunderabad west":                      "Secunderabad West",
  "secunderabad":                           "Secunderabad West",
  "secunderabad west metro station":        "Secunderabad West",
  "gandhi hospital":                        "Gandhi Hospital",
  "gandhi hospital metro station":          "Gandhi Hospital",
  "musheerabad":                            "Musheerabad",
  "musheerabad metro station":              "Musheerabad",
  "rtc x roads":                            "RTC X Roads",
  "rtc crossroads":                         "RTC X Roads",
  "rtc x road":                             "RTC X Roads",
  "rtc x roads metro station":              "RTC X Roads",
  "chikkadpally":                           "Chikkadpally",
  "chikkadpally metro station":             "Chikkadpally",
  "narayanguda":                            "Narayanguda",
  "narayanguda metro station":              "Narayanguda",
  "sultan bazar":                           "Sultan Bazar",
  "sultanbazar":                            "Sultan Bazar",
  "sultan bazar metro station":             "Sultan Bazar",
};

// ─────────────────────────────────────────────────────────────────────────────
// Haversine distance in km
// ─────────────────────────────────────────────────────────────────────────────
function haversine(a, b) {
  const R    = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const h    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ─────────────────────────────────────────────────────────────────────────────
// NAME NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
function normalizeStationName(raw) {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/,.*$/, "")
    .trim()
    .replace(/\s+(hyderabad|telangana|india)\s*$/i, "")
    .trim()
    .replace(
      /\s*(hyderabad\s+metro\s+rail\s+station|hyderabad\s+metro\s+station|metro\s+rail\s+station|metro\s+train\s+station|metro\s+station|metro\s+stop|metro\s+rail|metro\s+train|railway\s+station|bus\s+station|bus\s+stop|metro|station|stop)\s*$/i,
      ""
    )
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// STATION LOOKUP BY NAME
// ─────────────────────────────────────────────────────────────────────────────
function findStationByName(placeName) {
  if (!placeName) return null;

  const rawLower = placeName.toLowerCase().trim();

  // Step 0: Embedded canonical name detection
  const rawStripped = rawLower.replace(/,.*$/, "").trim();
  const sortedNames = [...ALL_STATION_NAMES].sort((a, b) => b.length - a.length);
  for (const stationName of sortedNames) {
    if (rawStripped.includes(stationName.toLowerCase())) {
      for (const [line, stations] of Object.entries(METRO_STATIONS)) {
        const st = stations.find(s => s.name === stationName);
        if (st) return { line, station: st, dist: 0 };
      }
    }
  }

  // Step 1: Normalize then alias table lookup
  const key = normalizeStationName(placeName);
  if (!key) return null;

  const aliasTarget = METRO_NAME_ALIASES[key];
  if (aliasTarget) {
    for (const [line, stations] of Object.entries(METRO_STATIONS)) {
      const st = stations.find(s => s.name === aliasTarget);
      if (st) return { line, station: st, dist: 0 };
    }
  }

  // Step 2: Exact station name match (case-insensitive)
  for (const [line, stations] of Object.entries(METRO_STATIONS)) {
    const st = stations.find(s => s.name.toLowerCase() === key);
    if (st) return { line, station: st, dist: 0 };
  }

  // Step 3: Starts-with match
  for (const [line, stations] of Object.entries(METRO_STATIONS)) {
    const st = stations.find(
      s => s.name.toLowerCase().startsWith(key) || key.startsWith(s.name.toLowerCase())
    );
    if (st) return { line, station: st, dist: 0 };
  }

  // Step 4: Substring match
  for (const [line, stations] of Object.entries(METRO_STATIONS)) {
    const st = stations.find(
      s => s.name.toLowerCase().includes(key) || key.includes(s.name.toLowerCase())
    );
    if (st) return { line, station: st, dist: 0 };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE STATION FINDER
// ─────────────────────────────────────────────────────────────────────────────
function findCandidateMetroStations(placeName, coords) {
  const candidates = [];
  const seen = new Set();

  if (placeName) {
    const nameMatch = findStationByName(placeName);
    if (nameMatch) {
      const key = `${nameMatch.line}:${nameMatch.station.name}`;
      seen.add(key);
      candidates.push({ ...nameMatch, dist: 0 });
    }
  }

  if (candidates.length > 0) {
    return candidates;
  }

  const fc = coords || { lat: 17.40, lon: 78.50 };
  for (const [line, stations] of Object.entries(METRO_STATIONS)) {
    for (const st of stations) {
      const key = `${line}:${st.name}`;
      if (seen.has(key)) continue;
      const d = haversine(fc, st);
      if (d <= MAX_METRO_WALK_KM) {
        seen.add(key);
        candidates.push({ line, station: st, dist: d });
      }
    }
  }

  return candidates.sort((a, b) => a.dist - b.dist);
}

function getStationsBetweenOnLine(fromName, toName, line) {
  const stations = METRO_STATIONS[line];
  if (!stations) return [];
  const fi = stations.findIndex(s => s.name === fromName);
  const ti = stations.findIndex(s => s.name === toName);
  if (fi === -1 || ti === -1) return [];
  const [lo, hi] = fi <= ti ? [fi, ti] : [ti, fi];
  const seg = stations.slice(lo, hi + 1);
  return fi <= ti ? seg : [...seg].reverse();
}

function findInterchange(fromLine, toLine) {
  if (fromLine === toLine) return null;
  const ic = METRO_INTERCHANGES.find(i => i.lines.includes(fromLine) && i.lines.includes(toLine));
  return ic ? ic.name : null;
}

function buildMetroRoutePlan(fromEntry, toEntry) {
  const fromLine    = fromEntry.line;
  const toLine      = toEntry.line;
  const fromStation = fromEntry.station.name;
  const toStation   = toEntry.station.name;

  if (fromStation === toStation) return null;

  // CASE 1: Direct (same line)
  if (fromLine === toLine) {
    const stations = getStationsBetweenOnLine(fromStation, toStation, fromLine);
    if (stations.length === 0) return null;
    return {
      type: "direct", fromStation, toStation,
      fromLine, toLine: fromLine,
      needsChange: false, changeAt: null, changeToLine: null,
      leg1: { line: fromLine, stations: stations.map(s => s.name) },
      leg2: null, leg3: null,
      allStations: stations.map(s => s.name),
      stationCount: stations.length,
    };
  }

  // CASE 2: From-station itself is an interchange
  const fromAsIC = METRO_INTERCHANGES.find(ic => ic.name === fromStation && ic.lines.includes(toLine));
  if (fromAsIC) {
    const leg2Stations = getStationsBetweenOnLine(fromStation, toStation, toLine);
    if (leg2Stations.length > 0) {
      return {
        type: "direct", fromStation, toStation,
        fromLine: toLine, toLine,
        needsChange: false, changeAt: null, changeToLine: null,
        leg1: { line: toLine, stations: leg2Stations.map(s => s.name) },
        leg2: null, leg3: null,
        allStations: leg2Stations.map(s => s.name),
        stationCount: leg2Stations.length,
      };
    }
  }

  // CASE 3: To-station itself is an interchange
  const toAsIC = METRO_INTERCHANGES.find(ic => ic.name === toStation && ic.lines.includes(fromLine));
  if (toAsIC) {
    const leg1Stations = getStationsBetweenOnLine(fromStation, toStation, fromLine);
    if (leg1Stations.length > 0) {
      return {
        type: "direct", fromStation, toStation,
        fromLine, toLine: fromLine,
        needsChange: false, changeAt: null, changeToLine: null,
        leg1: { line: fromLine, stations: leg1Stations.map(s => s.name) },
        leg2: null, leg3: null,
        allStations: leg1Stations.map(s => s.name),
        stationCount: leg1Stations.length,
      };
    }
  }

  // CASE 4: Blue ↔ Green interchange
  if (
    (fromLine === "blue"  && toLine === "green") ||
    (fromLine === "green" && toLine === "blue")
  ) {
    const blueIC  = BLUE_GREEN_INTERCHANGE.blueName;
    const greenIC = BLUE_GREEN_INTERCHANGE.greenName;

    if (fromLine === "blue") {
      const leg1 = getStationsBetweenOnLine(fromStation, blueIC, "blue");
      const leg2 = getStationsBetweenOnLine(greenIC, toStation, "green");
      if (leg1.length > 0 && leg2.length > 0) {
        const allStations = [...leg1.map(s => s.name), ...leg2.map(s => s.name)];
        return {
          type: "interchange", fromStation, toStation, fromLine, toLine: "green",
          needsChange: true, changeAt: blueIC, changeToLine: "green",
          leg1: { line: "blue",  stations: leg1.map(s => s.name) },
          leg2: { line: "green", stations: leg2.map(s => s.name) },
          leg3: null,
          allStations, stationCount: allStations.length,
          changeAtDisplay: `${blueIC} → ${greenIC}`,
        };
      }
    } else {
      const leg1 = getStationsBetweenOnLine(fromStation, greenIC, "green");
      const leg2 = getStationsBetweenOnLine(blueIC, toStation, "blue");
      if (leg1.length > 0 && leg2.length > 0) {
        const allStations = [...leg1.map(s => s.name), ...leg2.map(s => s.name)];
        return {
          type: "interchange", fromStation, toStation, fromLine, toLine: "blue",
          needsChange: true, changeAt: greenIC, changeToLine: "blue",
          leg1: { line: "green", stations: leg1.map(s => s.name) },
          leg2: { line: "blue",  stations: leg2.map(s => s.name) },
          leg3: null,
          allStations, stationCount: allStations.length,
          changeAtDisplay: `${greenIC} → ${blueIC}`,
        };
      }
    }
  }

  // CASE 5: One standard interchange (Red ↔ Blue, Red ↔ Green)
  const interchangeName = findInterchange(fromLine, toLine);
  if (interchangeName) {
    const leg1Stations = getStationsBetweenOnLine(fromStation, interchangeName, fromLine);
    const leg2Stations = getStationsBetweenOnLine(interchangeName, toStation, toLine);
    if (leg1Stations.length > 0 && leg2Stations.length > 0) {
      const allStations = [
        ...leg1Stations.map(s => s.name),
        ...leg2Stations.slice(1).map(s => s.name),
      ];
      return {
        type: "interchange", fromStation, toStation, fromLine, toLine,
        needsChange: true, changeAt: interchangeName, changeToLine: toLine,
        leg1: { line: fromLine, stations: leg1Stations.map(s => s.name) },
        leg2: { line: toLine,   stations: leg2Stations.map(s => s.name) },
        leg3: null,
        allStations, stationCount: allStations.length,
      };
    }
  }

  // CASE 6: Double interchange (fallback)
  const bridges = [
    { from:"blue",  via1:"Ameerpet",       via2:"MG Bus Station", to:"green" },
    { from:"green", via1:"MG Bus Station", via2:"Ameerpet",        to:"blue"  },
  ];
  for (const bridge of bridges) {
    if (fromLine === bridge.from && toLine === bridge.to) {
      const leg1Stations = getStationsBetweenOnLine(fromStation, bridge.via1, fromLine);
      const midStations  = getStationsBetweenOnLine(bridge.via1, bridge.via2, "red");
      const leg3Stations = getStationsBetweenOnLine(bridge.via2, toStation, toLine);
      if (leg1Stations.length > 0 && midStations.length > 0 && leg3Stations.length > 0) {
        const allStations = [
          ...leg1Stations.map(s => s.name),
          ...midStations.slice(1).map(s => s.name),
          ...leg3Stations.slice(1).map(s => s.name),
        ];
        return {
          type: "double_interchange", fromStation, toStation, fromLine, toLine,
          needsChange: true, changeAt: bridge.via1, changeToLine: "red",
          change2At: bridge.via2, change2ToLine: toLine,
          leg1: { line: fromLine, stations: leg1Stations.map(s => s.name) },
          leg2: { line: "red",    stations: midStations.map(s => s.name)  },
          leg3: { line: toLine,   stations: leg3Stations.map(s => s.name) },
          allStations, stationCount: allStations.length,
        };
      }
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// METRO FARE — Official L&T Metro revised fare chart (effective 24 May 2025)
//
// Distance slabs (straight-line route km between stations):
//   0  – 2  km  → ₹11
//   2  – 4  km  → ₹17
//   4  – 6  km  → ₹28
//   6  – 9  km  → ₹37
//   9  – 12 km  → ₹47
//   12 – 15 km  → ₹51
//   15 – 18 km  → ₹56   ← LB Nagar ↔ Punjagutta is ~15.5 km = ₹56 ✓
//   18 – 21 km  → ₹61
//   21 – 24 km  → ₹65
//   > 24 km     → ₹69
//
// Source: ltmetro.com/wp-content/uploads/2025/05/
//         Hyderabad-Metro-Rail-Revised-Fare-Chart-Final.pdf
// ─────────────────────────────────────────────────────────────────────────────
function calcMetroFare(distanceKm) {
  if (distanceKm <=  2) return 11;
  if (distanceKm <=  4) return 17;
  if (distanceKm <=  6) return 28;
  if (distanceKm <=  9) return 37;
  if (distanceKm <= 12) return 47;
  if (distanceKm <= 15) return 51;
  if (distanceKm <= 18) return 56;
  if (distanceKm <= 21) return 61;
  if (distanceKm <= 24) return 65;
  return 69;
}

function buildMetroInfo(from, to, fromCoords, toCoords) {
  const fc = fromCoords || { lat:17.40, lon:78.50 };
  const tc = toCoords   || { lat:17.42, lon:78.44 };

  const fromCandidates = findCandidateMetroStations(from, fc);
  const toCandidates   = findCandidateMetroStations(to,   tc);

  if (fromCandidates.length === 0 || toCandidates.length === 0) return null;

  const bestFrom = fromCandidates[0];
  const bestTo   = toCandidates[0];

  if (bestFrom.dist > MAX_METRO_WALK_KM && bestTo.dist > MAX_METRO_WALK_KM) return null;

  const validRoutes = [];

  for (const fromEntry of fromCandidates.slice(0, 4)) {
    for (const toEntry of toCandidates.slice(0, 4)) {
      if (fromEntry.station.name === toEntry.station.name) continue;

      const plan = buildMetroRoutePlan(fromEntry, toEntry);
      if (plan) {
        // Use actual haversine distance between first and last station for fare
        const firstSt = fromEntry.station;
        const lastSt  = toEntry.station;
        const stationDistKm = haversine(firstSt, lastSt);

        validRoutes.push({
          plan,
          walkToBoard:    fromEntry.dist,
          walkFromAlight: toEntry.dist,
          totalWalk:      fromEntry.dist + toEntry.dist,
          interchanges:   plan.type === "direct" ? 0 : plan.type === "interchange" ? 1 : 2,
          totalStations:  plan.stationCount,
          stationDistKm,
          nameMatchBonus: (fromEntry.dist === 0 ? 1 : 0) + (toEntry.dist === 0 ? 1 : 0),
        });
      }
    }
  }

  if (validRoutes.length === 0) return null;

  validRoutes.sort((a, b) => {
    if (b.nameMatchBonus !== a.nameMatchBonus) return b.nameMatchBonus - a.nameMatchBonus;
    if (a.interchanges   !== b.interchanges)   return a.interchanges   - b.interchanges;
    if (Math.abs(a.totalWalk - b.totalWalk) > 0.3) return a.totalWalk - b.totalWalk;
    return a.totalStations - b.totalStations;
  });

  const best = validRoutes[0];
  const plan = best.plan;

  const walkToMin   = best.walkToBoard   === 0 ? 0 : Math.max(3, Math.round(best.walkToBoard   * 12));
  const walkFromMin = best.walkFromAlight === 0 ? 0 : Math.max(3, Math.round(best.walkFromAlight * 12));

  const metroInfo = {
    fromStation:          plan.fromStation,
    toStation:            plan.toStation,
    fromLine:             plan.fromLine,
    toLine:               plan.toLine,
    needsChange:          plan.needsChange,
    changeAt:             plan.changeAt     || null,
    changeToLine:         plan.changeToLine || null,
    stations:             plan.allStations,
    stationCount:         plan.stationCount,
    walkToBoard:          walkToMin   === 0 ? "At station" : `${walkToMin} min`,
    walkFromAlight:       walkFromMin === 0 ? "At station" : `${walkFromMin} min`,
    boardingIsNameMatch:  best.walkToBoard   === 0,
    alightingIsNameMatch: best.walkFromAlight === 0,
    routeType:            plan.type,
    leg1:  plan.leg1 || null,
    leg2:  plan.leg2 || null,
    leg3:  plan.leg3 || null,
    fare:  calcMetroFare(best.stationDistKm),
  };

  if (plan.type === "double_interchange") {
    metroInfo.change2At     = plan.change2At;
    metroInfo.change2ToLine = plan.change2ToLine;
  }

  if (plan.changeAtDisplay) {
    metroInfo.changeAtDisplay = plan.changeAtDisplay;
  }

  return metroInfo;
}

// ─── Bus routing helpers ──────────────────────────────────────────────────────

function getZone(coords) {
  const { lat, lon } = coords;
  if (lat < 17.38  && lon > 78.54)  return "se";
  if (lat < 17.42  && lon > 78.54)  return "east";
  if (lat > 17.43  && lon > 78.49)  return "north";
  if (lat > 17.46  && lon < 78.43)  return "nw";
  if (lon < 78.39)                   return "west_far";
  if (lon < 78.41)                   return "west";
  if (lon < 78.43)                   return "west_mid";
  if (lat < 17.41  && lon < 78.45)  return "sw";
  if (lat > 17.42  && lon < 78.45)  return "banjara";
  return "central";
}

function nearestStop(coords) {
  return BUS_STOPS.reduce((best, stop) => {
    const d = haversine(coords, stop);
    return d < best.d ? { stop, d } : best;
  }, { stop: BUS_STOPS[0], d: Infinity }).stop;
}

function stopsOnPath(fromCoords, toCoords, tolerance = 0.28) {
  const total = haversine(fromCoords, toCoords);
  return BUS_STOPS
    .map(stop => {
      const dFrom  = haversine(fromCoords, stop);
      const dTo    = haversine(stop, toCoords);
      const detour = (dFrom + dTo) / total;
      return { stop, dFrom, detour };
    })
    .filter(s => s.detour <= 1 + tolerance && s.dFrom > 0.2 && s.dFrom < total - 0.2)
    .sort((a, b) => a.dFrom - b.dFrom)
    .map(s => s.stop);
}

function selectStops(fromCoords, toCoords, maxStops = 8) {
  const from = nearestStop(fromCoords);
  const to   = nearestStop(toCoords);
  const path = stopsOnPath(fromCoords, toCoords);
  const all  = [from, ...path.filter(s => s.name !== from.name && s.name !== to.name), to];
  if (all.length <= maxStops) return all.map(s => s.name);
  const result = [all[0]];
  const step   = (all.length - 1) / (maxStops - 1);
  for (let i = 1; i < maxStops - 1; i++) result.push(all[Math.round(i * step)]);
  result.push(all[all.length - 1]);
  return result.map(s => s.name);
}

function findBestCorridors(fromCoords, toCoords) {
  const fromZone = getZone(fromCoords);
  const toZone   = getZone(toCoords);
  const direct   = TSRTC_BUS_CORRIDORS.filter(c =>
    (c.fromZone === fromZone && (c.toZone === toZone || c.toZone === "central" || toZone === "central")) ||
    (c.toZone === fromZone && c.fromZone === toZone)
  );
  return direct.length > 0
    ? direct
    : TSRTC_BUS_CORRIDORS.filter(c => c.fromZone === "central" || c.toZone === "central").slice(0, 2);
}

function fmt(date) {
  return date.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true });
}

function addMin(date, mins) {
  return new Date(date.getTime() + mins * 60000);
}

function makeSchedule(stopNames, depDate, durationMin) {
  const perMs = (durationMin * 60000) / Math.max(stopNames.length - 1, 1);
  return stopNames.map((name, i) => ({
    name,
    time: fmt(new Date(depDate.getTime() + i * perMs)),
  }));
}

function getBusRouteData(from, to, fromCoords, toCoords, distanceKm, baseDrivingMin) {
  const now = new Date();
  const fc  = fromCoords || { lat:17.40, lon:78.50 };
  const tc  = toCoords   || { lat:17.42, lon:78.44 };

  const nearFrom     = nearestStop(fc);
  const nearTo       = nearestStop(tc);
  const pathStops    = selectStops(fc, tc, 10);
  const corridors    = findBestCorridors(fc, tc);

  const busDurMin    = Math.round(baseDrivingMin * 1.9 + distanceKm * 0.7);
  const walkToStop   = Math.round(haversine(fc, nearFrom) * 12) || 5;
  const walkFromStop = Math.round(haversine(tc, nearTo)   * 12) || 5;
  const fare         = corridors[0]?.fare || Math.max(15, Math.round(10 + distanceKm * 2.2));

  const directBuses = corridors.slice(0, 2).map((corr, i) => {
    const dep   = addMin(now, walkToStop + 3 + i * 10);
    const arr   = addMin(dep, busDurMin);
    const stops = [nearFrom.name, ...pathStops.slice(1, -1), nearTo.name];
    return {
      busNo:           corr.busNo,
      via:             pathStops.slice(1, 3).join(" · ") || corr.corridor.split("→")[1]?.trim() || "",
      departure:       fmt(dep),
      arrival:         fmt(arr),
      duration:        `${busDurMin} min`,
      durationMin:     busDurMin,
      boardingStop:    nearFrom.name,
      alightingStop:   nearTo.name,
      totalStops:      stops.length,
      frequency:       corr.freq,
      fare:            corr.fare,
      walkToStop,
      walkToStopLabel: `${walkToStop} min, ~${walkToStop * 75} m`,
      walkFromStop,
      stops,
      stopCount:       stops.length,
      stopSchedule:    makeSchedule(stops, dep, busDurMin),
    };
  });

  const transferRoutes = [];
  if (distanceKm > 12 && pathStops.length >= 3) {
    const midStopName = pathStops[Math.floor(pathStops.length / 2)];
    const leg1Dur     = Math.round(busDurMin * 0.58);
    const leg2Dur     = Math.round(busDurMin * 0.42);
    const leg1Stops   = [nearFrom.name, ...pathStops.slice(1, Math.ceil(pathStops.length / 2)), midStopName];
    const leg2Stops   = [midStopName, ...pathStops.slice(Math.ceil(pathStops.length / 2) + 1), nearTo.name];
    const dep1        = addMin(now, walkToStop + 3);
    const arr1        = addMin(dep1, leg1Dur);
    const dep2        = addMin(arr1, 7);
    const arr2        = addMin(dep2, leg2Dur);
    const bus2        = corridors[1] || corridors[0];
    transferRoutes.push({
      description: `${corridors[0].busNo} → ${bus2.busNo} via ${midStopName}`,
      legs: [
        { busNo: corridors[0].busNo, from: nearFrom.name, to: midStopName, stops: leg1Stops, stopSchedule: makeSchedule(leg1Stops, dep1, leg1Dur), stopCount: leg1Stops.length, duration: `${leg1Dur} min`, durationMin: leg1Dur, frequency: corridors[0].freq, changeAt: midStopName, depTime: fmt(dep1), arrTime: fmt(arr1) },
        { busNo: bus2.busNo, from: midStopName, to: nearTo.name, stops: leg2Stops, stopSchedule: makeSchedule(leg2Stops, dep2, leg2Dur), stopCount: leg2Stops.length, duration: `${leg2Dur} min`, durationMin: leg2Dur, frequency: bus2.freq, changeAt: null, depTime: fmt(dep2), arrTime: fmt(arr2) },
      ],
      totalTime: `${leg1Dur + 7 + leg2Dur} min`, totalMinutes: leg1Dur + 7 + leg2Dur,
      fare: Math.round(fare * 1.4), arrival: fmt(arr2),
    });
  }

  const busNumbers = [
    ...directBuses.map(b => b.busNo),
    ...transferRoutes.flatMap(t => t.legs.map(l => l.busNo)),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const fromZone = getZone(fc);
  const toZone   = getZone(tc);
  const note = (fromZone !== toZone && distanceKm > 15)
    ? `Approximate route via ${pathStops[Math.floor(pathStops.length / 2)] || "city center"}. Verify with TSRTC app.`
    : null;

  return {
    hasRealData: true, directBuses, transferRoutes,
    stops: pathStops.length - 1, stopsList: pathStops, busNumbers,
    frequency: corridors[0]?.freq || "every 12–15 min",
    boardingPoint: nearFrom.name, alightingPoint: nearTo.name,
    fare, duration: busDurMin, walkToStop, walkFromStop, note,
  };
}

function getStopsList(from, to, distanceKm) {
  const fk      = from.toLowerCase().split(",")[0].trim();
  const tk      = to.toLowerCase().split(",")[0].trim();
  const fromHub = BUS_STOPS.find(s => s.name.toLowerCase().includes(fk)) || { name: `${from.split(",")[0].trim()} Bus Stop` };
  const toHub   = BUS_STOPS.find(s => s.name.toLowerCase().includes(tk)) || { name: `${to.split(",")[0].trim()} Bus Stop` };
  const mids    = Math.max(2, Math.round(distanceKm * 0.35));
  return [fromHub.name, ...Array(mids).fill(0).map((_, i) => `Stop ${i + 1}`), toHub.name];
}

function calculateCost(distanceKm, durationMin, from = "", to = "") {
  const busFare = Math.max(15, Math.round(10 + distanceKm * 2.2));
  const busDur  = Math.round(durationMin * 1.9 + distanceKm * 0.7);
  const metroCost = calcMetroFare(distanceKm);
  return {
    bike:  { label:"Bike",  cost:Math.round(20 + distanceKm * 6),  time:Math.round(durationMin * 1.0), emoji:"🏍️", mode:"bike",  note:"Rapido / Ola Bike" },
    car:   { label:"Car",   cost:Math.round(75 + distanceKm * 13),  time:Math.round(durationMin * 1.1), emoji:"🚗",  mode:"car",   note:"Ola / Uber / Self Drive" },
    bus:   { label:"Bus",   cost:busFare,                           time:busDur,                        emoji:"🚌",  mode:"bus",   note:"TSRTC" },
    metro: { label:"Metro", cost:metroCost,                         time:Math.round(durationMin * 1.3), emoji:"🚇",  mode:"metro", note:"Hyderabad Metro" },
  };
}

module.exports = { calculateCost, getStopsList, getBusRouteData, buildMetroInfo };