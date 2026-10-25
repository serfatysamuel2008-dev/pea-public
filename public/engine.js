/* Mon PEA — logique métier partagée entre le serveur (Node) et le navigateur.
   Le serveur l'utilise pour valider et appliquer chaque opération ; le navigateur
   s'en sert pour les aperçus (parts, répartition, impôt) et pour le mode démo hors ligne. */
(function (root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function (){
"use strict";

/* ---------- formatting ---------- */
const F2 = new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
const F0 = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const F1 = new Intl.NumberFormat('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1});
const eur = v => F2.format(v) + ' €';
const eur0 = v => F0.format(Math.round(v)) + ' €';
const sgn = v => v >= 0 ? '+' : '−';
const pct = v => sgn(v) + F1.format(Math.abs(v)) + ' %';
const tri = v => v >= 0 ? '▲' : '▼';
const r2 = v => Math.round(v * 100) / 100;
const money = x => Number.isInteger(x) ? eur0(x) : eur(x);
const lower = s => s.charAt(0).toLowerCase() + s.slice(1);
const de = n => /^ETF/.test(n) || (!/^[A-Z]{2}/.test(n) && /^[AEIOUYHÉÈaeiouyhéè]/.test(n)) ? 'd’' + n : 'de ' + n;

/* ---------- products ---------- */
const PR = {
  pea:{points:['Actions européennes et ETF', 'Zéro impôt sur le revenu sur tes gains après 5 ans', 'Jusqu’à 150 000 € de versements'], kind:'shares', name:'Mon PEA', ab:'PEA', tone:'blue', group:'Bourse', label:'Actions européennes, fiscalité douce', vaut:'Ton PEA vaut', ton:'ton PEA', nav:['Portefeuille','Avantages'], open:new Date(2023,2,12), years:5},
  pme:{points:['Tu finances des PME et ETI européennes', 'Zéro impôt sur le revenu sur tes gains après 5 ans', 'Plafond commun avec ton PEA : 225 000 €'], kind:'shares', name:'Mon PEA-PME', ab:'PME', tone:'teal', group:'Bourse', label:'PME et ETI européennes', vaut:'Ton PEA-PME vaut', ton:'ton PEA-PME', nav:['Portefeuille','Avantages'], open:new Date(2024,2,12), years:5},
  ct:{points:['Toutes les bourses : actions, ETF, obligations', 'Sans plafond ni durée minimale', 'Gains imposés à 31,4 % quand tu vends'], kind:'shares', name:'Mon compte-titres', ab:'CT', tone:'orange', group:'Bourse', label:'Toutes les bourses, sans plafond', vaut:'Ton compte-titres vaut', ton:'ton compte-titres', nav:['Portefeuille','Fiscalité'], open:new Date(2022,4,2)},
  av:{points:['Fonds euros sécurisé et unités de compte', 'Ton argent reste disponible à tout moment', 'Un cadre fiscal avantageux pour tes bénéficiaires'], kind:'contract', name:'Mon assurance vie', ab:'AV', tone:'green', group:'Épargne long terme', label:'Épargne disponible et transmission', vaut:'Ton assurance vie vaut', ton:'ton assurance vie', nav:['Supports','Avantages'], open:new Date(2021,2,12), years:8, op2:['withdraw','Retirer'], sub:'Répartition selon ton profil'},
  cc:{points:['Fonds euros, ETF et immobilier, en gestion libre', 'Tu peux le donner de ton vivant sans perdre son ancienneté', 'Fiscalité allégée sur les gains après 8 ans'], kind:'contract', name:'Mon contrat de capitalisation', ab:'CC', tone:'purple', group:'Épargne long terme', label:'Gestion libre, donation possible', vaut:'Ton contrat vaut', ton:'ton contrat', nav:['Supports','Transmission'], open:new Date(2021,2,12), years:8, op2:['arb','Arbitrer'], sub:'Gestion libre · ta répartition'},
  per:{points:['Prépare ta retraite à ton rythme', 'Tes versements se déduisent de ton revenu imposable', 'À la retraite : capital, rente ou les deux'], kind:'contract', name:'Mon PER', ab:'PER', tone:'rose', group:'Épargne long terme', label:'Retraite, versements déductibles', vaut:'Ton PER vaut', ton:'ton PER', nav:['Supports','Retraite'], open:new Date(2024,0,12), retire:2064, op2:['simulate','Simuler'], sub:'Versement déductible'}
};
const ORDER = ['pea','pme','ct','av','cc','per'];
const PROFILES = {
  prudent:{label:'Prudent', adj:'prudent', alloc:{FE:80, MO:15, IM:5}, why:'limiter les variations'},
  equilibre:{label:'Équilibré', adj:'équilibré', alloc:{FE:60, MO:30, IM:10}, why:'viser plus de rendement'},
  dynamique:{label:'Dynamique', adj:'dynamique', alloc:{FE:30, MO:55, IM:15}, why:'viser plus de rendement sur la durée'}
};
const SHORT = {MO:'ETF', FE:'euros', IM:'immo', OB:'oblig.'};
const PEA_CAP = 150000, COMMON_CAP = 225000;
const AMOUNTS = [25, 50, 100, 200];
const TMIS = [0, 11, 30, 41, 45];
const MAX_AMOUNT = 1e7;

/* ---------- market catalogue (cours fictifs) ---------- */
const TONES = ['blue','orange','green','purple','teal','rose'];
const hash = s => { let h = 7; for (const c of s) h = (h*31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const E = (id,name,sub,price,day,p1a,p5a,ter,aum,lines) => ({id,name,sub,type:'etf',price,day,p1a,p5a,ter,aum,lines});
const A = (id,name,sector,country,price,day,p1a,p5a,cap,per,dy,d) => ({id,name,sub:sector,type:'action',country,price,day,p1a,p5a,cap,per,dy,d});
const B = (id,name,issuer,price,day,p1a,p5a,coupon,mat,ytm,rating) => ({id,name,sub:issuer,type:'oblig',price,day,p1a,p5a,coupon,mat,ytm,rating});
const MARKET = [
  E('MO','ETF Monde','MSCI World',320.63,0.8,14.2,62,0.25,4200,1400),
  E('US','ETF S&P 500','S&P 500',37.25,0.4,18.5,84,0.15,3100,503),
  E('EU','ETF Europe','Stoxx Europe 600',86.93,-0.3,7.9,38,0.20,1200,600),
  E('NQ','ETF Nasdaq-100','Nasdaq-100',92.40,1.2,24.8,118,0.30,1800,101),
  E('CAC','ETF CAC 40','CAC 40',81.15,-0.2,4.1,31,0.25,900,40),
  E('ESX','ETF Euro Stoxx 50','Euro Stoxx 50',58.70,0.1,9.6,45,0.20,750,50),
  E('DAX','ETF Allemagne','DAX 40',178.20,0.3,15.7,52,0.15,410,40),
  E('EM','ETF Émergents','MSCI Emerging Markets',24.18,0.6,11.3,9,0.30,680,1200),
  E('JP','ETF Japon','MSCI Japan',23.56,-0.7,12.4,33,0.45,310,230),
  E('IN','ETF Inde','MSCI India',27.92,0.9,6.5,71,0.65,140,150),
  E('TEC','ETF Technologie Monde','MSCI World IT',48.66,1.5,27.1,132,0.35,520,240),
  E('HLT','ETF Santé Monde','MSCI World Health Care',34.12,-0.1,3.4,29,0.30,260,140),
  E('SMC','ETF Petites capi. Europe','MSCI Europe Small Cap',162.30,-0.4,5.2,21,0.40,220,900),
  E('DIV','ETF Dividendes Europe','Stoxx Europe Select Dividend 30',21.05,0.2,8.8,26,0.30,180,30),
  E('NRJ','ETF Énergies propres','S&P Global Clean Energy',9.84,2.1,-6.3,-24,0.40,95,100),
  Object.assign(E('PME','ETF PME Europe','Petites capi. européennes',58.40,0.6,15.2,30,0.45,320,800), {ab:'EU', pme:true}),
  Object.assign(E('FPF','Fonds PME France','Fonds actions PME',160.67,0.3,12.8,25,1.20,180,60), {ab:'FR', pme:true}),
  Object.assign(E('SCF','ETF Small Caps France','CAC Small',132.29,-0.5,-2.4,10,0.35,150,90), {ab:'SC', pme:true}),
  Object.assign(E('NQU','ETF Nasdaq 100','Nasdaq-100 · réplication physique',102.35,1.2,32.1,140,0.20,2600,101), {ab:'NQ', cto:true}),
  Object.assign(E('EMU','ETF Émergents','MSCI EM IMI · réplication physique',76.91,0.4,9.4,18,0.18,1900,3000), {ab:'EM', cto:true}),
  Object.assign(E('OBL','ETF Obligations','Obligations mondiales',30.23,-0.1,-0.6,-6,0.10,2400,3000), {ab:'OB', cto:true}),
  A('MC','LVMH','Luxe','France',642.30,-0.9,-8.4,12,322,22.5,2.0,'Numéro un mondial du luxe : Louis Vuitton, Dior, Moët Hennessy, Sephora.'),
  A('RMS','Hermès','Luxe','France',2315.00,-0.5,4.3,160,244,49.0,0.8,'Maroquinerie, soie et prêt-à-porter haut de gamme, fabriqués en grande partie en France.'),
  A('OR','L’Oréal','Cosmétiques','France',372.10,0.2,-6.1,18,199,30.4,1.9,'Premier groupe de cosmétiques au monde : Lancôme, Garnier, La Roche-Posay.'),
  A('TTE','TotalEnergies','Énergie','France',56.84,0.6,-4.2,48,128,8.1,5.6,'Pétrole, gaz et électricité, avec une part croissante de renouvelables.'),
  A('AIR','Airbus','Aéronautique','France',198.40,1.1,22.6,95,157,28.0,1.2,'Avions commerciaux, hélicoptères, défense et espace.'),
  A('SAF','Safran','Aéronautique','France',268.90,1.3,28.4,115,112,31.0,1.1,'Moteurs d’avions (avec GE) et équipements aéronautiques.'),
  A('HO','Thales','Défense','France',268.40,1.9,46.0,230,55,32.0,1.4,'Électronique de défense, aérospatial et cybersécurité.'),
  A('SU','Schneider Electric','Équipements électriques','France',238.75,0.7,9.8,110,134,29.0,1.6,'Gestion de l’énergie et automatismes pour bâtiments, usines et data centers.'),
  A('AI','Air Liquide','Chimie','France',176.48,0.1,6.0,52,102,28.5,1.9,'Gaz industriels et médicaux, présent dans 70 pays.'),
  A('SAN','Sanofi','Santé','France',94.12,-0.4,2.1,10,118,13.2,4.1,'Médicaments et vaccins, dont le Dupixent.'),
  A('EL','EssilorLuxottica','Optique','France',268.30,0.6,24.0,98,122,46.0,1.5,'Verres Essilor et montures Ray-Ban, Oakley.'),
  A('BNP','BNP Paribas','Banque','France',71.36,0.9,16.4,70,81,7.4,6.6,'Première banque de la zone euro.'),
  A('ACA','Crédit Agricole','Banque','France',16.42,0.7,18.9,52,50,7.8,6.8,'Banque de détail, assurance et gestion d’actifs (Amundi).'),
  A('GLE','Société Générale','Banque','France',42.10,1.4,62.0,110,33,8.9,3.1,'Banque de détail, banque d’investissement et location de véhicules.'),
  A('DG','Vinci','Construction','France',118.96,0.5,4.8,36,69,13.9,4.0,'Autoroutes, aéroports et chantiers de construction.'),
  A('SGO','Saint-Gobain','Matériaux','France',92.54,0.8,19.0,160,46,14.5,2.4,'Matériaux de construction légers et durables.'),
  A('ENGI','Engie','Énergie','France',18.72,0.2,14.3,48,45,9.1,7.4,'Électricité, gaz et réseaux, avec un fort virage vers le renouvelable.'),
  A('VIE','Veolia','Environnement','France',30.15,0.3,5.6,58,22,16.0,4.6,'Eau, déchets et énergie pour les villes et les industriels.'),
  A('ORA','Orange','Télécoms','France',13.18,0.3,21.5,30,35,12.6,5.7,'Opérateur télécom en Europe et en Afrique.'),
  A('BN','Danone','Alimentation','France',74.22,0.4,13.0,22,48,18.4,2.9,'Produits laitiers, eaux (Evian) et nutrition infantile.'),
  A('RI','Pernod Ricard','Spiritueux','France',86.40,-1.1,-22.0,-50,22,12.8,5.4,'Vins et spiritueux : Absolut, Jameson, Ricard.'),
  A('KER','Kering','Luxe','France',214.50,-2.3,-14.6,-62,26,20.5,2.8,'Gucci, Saint Laurent, Balenciaga.'),
  A('ML','Michelin','Pneumatiques','France',32.40,-0.3,-5.1,14,23,10.4,4.2,'Pneus pour voitures, camions et avions.'),
  A('RNO','Renault','Automobile','France',44.36,-0.6,-6.0,40,13,4.9,5.3,'Renault, Dacia et Alpine.'),
  A('STLA','Stellantis','Automobile','Pays-Bas',9.62,-1.8,-28.0,-20,28,5.3,7.1,'Peugeot, Citroën, Fiat, Jeep et 10 autres marques.'),
  A('PUB','Publicis','Publicité','France',96.20,0.4,2.5,120,24,14.3,3.7,'Communication, médias et conseil en données.'),
  A('CAP','Capgemini','Services informatiques','France',142.70,-0.8,-12.4,-8,24,13.0,2.4,'Conseil et services numériques pour les entreprises.'),
  A('DSY','Dassault Systèmes','Logiciels','France',29.84,-1.6,-18.2,-35,40,26.0,0.9,'Logiciels de conception 3D (Catia, SolidWorks).'),
  A('CA','Carrefour','Distribution','France',12.86,-0.2,-9.0,-18,9,10.5,7.0,'Hypermarchés, supermarchés et commerce en ligne.'),
  A('UBI','Ubisoft','Jeux vidéo','France',11.20,-3.4,-30.0,-82,1.5,null,0,'Éditeur de jeux vidéo : Assassin’s Creed, Far Cry.'),
  A('ASML','ASML','Semi-conducteurs','Pays-Bas',812.40,1.7,9.0,120,320,34.0,0.9,'Seul fabricant des machines de lithographie EUV pour les puces.'),
  A('SAP','SAP','Logiciels','Allemagne',236.10,0.5,12.0,125,275,38.0,1.0,'Logiciels de gestion pour les entreprises.'),
  A('SIE','Siemens','Industrie','Allemagne',214.85,0.9,18.0,70,170,18.4,2.5,'Automatisation, infrastructures et transport.'),
  A('ALV','Allianz','Assurance','Allemagne',362.20,0.4,20.0,80,140,12.5,4.4,'Assurance et gestion d’actifs dans plus de 70 pays.'),
  A('DTE','Deutsche Telekom','Télécoms','Allemagne',30.12,0.2,9.0,100,150,13.0,3.0,'Opérateur télécom, maison mère de T-Mobile US.'),
  A('NOVO','Novo Nordisk','Santé','Danemark',48.30,-2.1,-35.0,40,215,14.0,3.2,'Traitements du diabète et de l’obésité.'),
  A('RACE','Ferrari','Automobile de luxe','Italie',408.00,0.3,-3.0,140,74,42.0,0.8,'Voitures de sport fabriquées à Maranello.'),
  A('IBE','Iberdrola','Énergie','Espagne',16.84,0.6,22.0,70,108,17.0,3.8,'Électricité et énergies renouvelables.'),
  A('ITX','Inditex','Habillement','Espagne',48.22,-0.4,-2.0,92,150,25.0,3.4,'Zara, Massimo Dutti, Pull&Bear.'),
  A('ADY','Adyen','Paiements','Pays-Bas',1520.00,2.4,12.0,-10,47,42.0,0,'Plateforme de paiement pour les commerçants en ligne et en boutique.'),
  B('O34','OAT France 2034','État français',97.42,0.12,1.8,-9,3.0,'25/05/2034',3.38,'AA-'),
  B('O50','OAT France 2050','État français',72.10,-0.2,-1.5,-32,1.5,'25/05/2050',3.95,'AA-'),
  B('BND','Bund Allemagne 2033','État allemand',98.88,0.1,2.4,-6,2.6,'15/02/2033',2.78,'AAA'),
  B('BTP','BTP Italie 2032','État italien',101.30,0.15,4.1,2,3.85,'01/07/2032',3.62,'BBB'),
  B('TT30','TotalEnergies 2030','TotalEnergies',99.20,-0.1,3.0,-4,3.25,'15/03/2030',3.45,'A+'),
  B('MC29','LVMH 2029','LVMH',100.45,0.1,3.2,-2,3.5,'11/09/2029',3.32,'AA-'),
  B('AGG','ETF Obligations euro','Bloomberg Euro Aggregate',112.60,0.1,3.6,-8,null,'—',3.10,'A')
];
MARKET.forEach(a => { a.tone = {MO:'blue',US:'orange',EU:'green'}[a.id] || TONES[hash(a.id) % TONES.length]; a.eligible = a.type !== 'oblig' && !a.cto; if (a.id === 'SMC') a.pme = true; });
const mk = id => MARKET.find(a => a.id === id);
/* ---------- daily market model ----------
   Every price follows a deterministic daily path, so the server and the browser
   always agree. On ANCHOR day the prices equal the catalogue values above; the
   past is shaped to match each line's day / 1-year / 5-year performance, and
   from then on prices move a little every day. */
const DAY = 86400000;
const ANCHOR = Date.UTC(2026, 9, 24);
const BACK = 2300;
/* The clock can be pinned (tests, presentations); by default it is the real time. */
let clock = () => Date.now();
const setClock = fn => { clock = fn || (() => Date.now()); marketDay = null; };
const dayIndex = t => Math.floor(((t == null ? clock() : t) - ANCHOR) / DAY);
const dateOf = d => new Date(ANCHOR + d*DAY + 12*3600000);
const VOL = {etf:.16, action:.27, oblig:.05, euro:0, immo:.05, bond:.05};
const DRIFT = {etf:.065, action:.07, oblig:.03, euro:.026, immo:.03, bond:.03};
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gaussGen(seed){ const r = rng(seed); return () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*r()); }; }
const PATHS = new Map();
function baseOf(spec){
  if (!spec.b) spec.b = {price:spec.price, day:spec.day, p1a:spec.p1a, p5a:spec.p5a};
  return spec.b;
}
function pathOf(spec){
  const key = spec.key || spec.id;
  let P = PATHS.get(key); if (P) return P;
  const b = baseOf(spec), vol = VOL[spec.type] != null ? VOL[spec.type] : .16;
  const sd = vol / Math.sqrt(365), mu = Math.log(1 + (DRIFT[spec.type] != null ? DRIFT[spec.type] : .05)) / 365;
  const at = d => d + BACK, L0 = Math.log(b.price);
  const g = gaussGen(hash(key + ':past'));
  const z = new Float64Array(BACK + 1); for (let i = 1; i <= BACK; i++) z[i] = g() * sd;
  const lp = new Float64Array(BACK + 1);
  const fix = [[-BACK, null], [-1826, L0 - Math.log(1 + b.p5a/100)], [-365, L0 - Math.log(1 + b.p1a/100)], [-1, L0 - Math.log(1 + b.day/100)], [0, L0]];
  lp[at(0)] = L0;
  for (let k = fix.length - 1; k > 0; k--){
    const [d1, L1] = fix[k], [d0, Lf] = fix[k-1], n = d1 - d0;
    let sum = 0; for (let d = d0 + 1; d <= d1; d++) sum += z[at(d)];
    const La = Lf == null ? L1 - (sum + mu*n) : Lf, adj = (L1 - La - sum) / n;
    lp[at(d0)] = La;
    let cur = La; for (let d = d0 + 1; d < d1; d++){ cur += z[at(d)] + adj; lp[at(d)] = cur; }
  }
  P = {lp, fut:[L0], gf: gaussGen(hash(key + ':future')), sd, mu};
  PATHS.set(key, P);
  return P;
}
function logAt(spec, d){
  const P = pathOf(spec);
  if (d <= 0) return P.lp[Math.max(0, d + BACK)];
  while (P.fut.length <= d) P.fut.push(P.fut[P.fut.length - 1] + P.mu + P.sd * P.gf());
  return P.fut[d];
}
const priceAt = (spec, d) => r2(Math.exp(logAt(spec, d)));
/* Updates a catalogue line (or an index) to day d: price, day change, 1-year and 5-year performance. */
function refreshSpec(spec, d){
  baseOf(spec);
  const p = priceAt(spec, d), y = priceAt(spec, d - 1);
  spec.price = p;
  spec.day = Math.round((p/y - 1)*10000)/100;
  spec.p1a = Math.round((p/priceAt(spec, d - 365) - 1)*1000)/10;
  spec.p5a = Math.round((p/priceAt(spec, d - 1826) - 1)*1000)/10;
  return spec;
}
let marketDay = null;
function refreshMarket(d){
  if (marketDay === d) return;
  MARKET.forEach(a => refreshSpec(a, d));
  marketDay = d;
}

/* Contract supports are held in units; their unit value (1 on ANCHOR day) moves every day. */
const SUPPORT_SPECS = {
  FE:{key:'S:FE', type:'euro', price:1, day:0.007, p1a:2.6, p5a:12},
  IM:{key:'S:IM', type:'immo', price:1, day:-0.02, p1a:-3.2, p5a:4},
  OB:{key:'S:OB', type:'bond', price:1, day:0.05, p1a:1.1, p5a:-4}
};
function navAt(id, d){
  if (SUPPORT_SPECS[id]) return Math.exp(logAt(SUPPORT_SPECS[id], d));
  const m = mk(id);
  return m ? Math.exp(logAt(m, d) - Math.log(baseOf(m).price)) : 1;
}
function sampleDays(from, to, max){
  const n = Math.max(1, to - from), step = Math.max(1, Math.ceil(n / (max || 90))), out = [];
  for (let d = from; d < to; d += step) out.push(d);
  out.push(to);
  return out;
}
const specSeries = (spec, from, to, max) => sampleDays(from, to, max).map(d => ({t: dateOf(d).getTime(), v: priceAt(spec, d)}));
const navSeries = (id, units, from, to, max) => sampleDays(from, to, max).map(d => ({t: dateOf(d).getTime(), v: units * navAt(id, d)}));
/* Value of an account's current holdings on each day of [from, to]. */
function accountSeries(acc, from, to, max){
  return sampleDays(from, to, max).map(d => {
    let v = acc.cash || 0;
    acc.positions.forEach(p => {
      if (p.units != null) v += p.units * navAt(p.id, d);
      else { const m = mk(p.id); v += p.parts * (m ? priceAt(m, d) : p.price); }
    });
    return {t: dateOf(d).getTime(), v: r2(v)};
  });
}

const elig = (a, k) => k === 'ct' ? true : k === 'pme' ? !!a.pme : a.eligible;

/* ---------- default state ---------- */
/* The customer's external current account (imaginary): source of deposits, destination of withdrawals. */
const BANK = {name:'Compte courant', bank:'Banque externe', iban:'FR76 3000 6000 0112 3456 7890 189'};
const bankOf = G => G.bank || BANK;
const maskIban = iban => iban.slice(0, 4) + ' •••• ' + iban.replace(/\s/g, '').slice(-4);

/* An account the customer doesn't hold yet: same shape, empty. */
function emptyAccount(k){
  const pr = PR[k];
  if (pr.kind === 'shares') return Object.assign({opened:false, cash:0, deposits:0, positions:[], history:[], plan:null,
    draft:{amount:50, asset:{pea:'MO', pme:'PME', ct:'NQU'}[k], roundups:false}, notifs:[]}, k === 'ct' ? {realized:0, losses:0} : {});
  const SUP = {FE:['€','Fonds euros','Sécurisé','blue'], MO:['MO','ETF Monde','Unité de compte','orange'], IM:['IM','Immobilier','Unité de compte','green'], OB:['OB','Obligations','Unité de compte','green']};
  const alloc = {av:{FE:60, MO:30, IM:10}, cc:{MO:50, FE:30, IM:20}, per:{MO:60, FE:25, OB:15}}[k];
  return Object.assign({opened:false, deposits:0, alloc: Object.assign({}, alloc),
    positions: Object.keys(alloc).map(id => ({id, ab:SUP[id][0], name:SUP[id][1], sub:SUP[id][2], tone:SUP[id][3], value:0, cost:0, day:0, units:0})),
    history:[], plan:null, draft:{amount:50, roundups:false}, notifs:[]}, k === 'av' ? {profile:'equilibre'} : k === 'per' ? {year:0, tmi:30} : {});
}
function defaults(firstName){
  const now = Date.now(), D = 86400000, H = 3600000;
  const ps = (id, ab, name, sub, tone, parts, price, cost, day) => ({id, ab, name, sub, tone, parts, price, cost, day});
  const sp = (id, ab, name, sub, tone, value, cost, day) => ({id, ab, name, sub, tone, value, cost, day, units: value / navAt(id, 0)});
  const dep = (days, amount, detail) => ({t: now - D*days, kind:'deposit', label:'Versement', detail: detail || 'Depuis ton compte courant', amount});
  const G = {v:4, bank:Object.assign({}, BANK), firstName: firstName || 'Léa', active:'pea', favs:['MO','AIR','ASML'], accounts:{
    pea:{cash:1250, deposits:21500,
      positions:[ps('MO','MO','ETF Monde','MSCI World','blue',48,320.63,13020.51,0.8), ps('US','US','ETF S&P 500','Actions US','orange',160,37.25,4909.39,0.4), ps('EU','EU','ETF Europe','Stoxx 600','green',26,86.93,2301.61,-0.3)],
      history:[{t: now - D*12, kind:'auto', label:'Versement programmé', detail:'ETF Monde', amount:50}, dep(40, 1000), {t: now - D*75, kind:'buy', label:'Achat · 4 parts', detail:'ETF S&P 500', amount:-148.6}],
      plan:null, draft:{amount:50, asset:'MO', roundups:false},
      notifs:[{id:1, title:'Tu as 1 250 € qui dorment', body:'Place-les sur ton ETF Monde en 2 clics.', t: now - H*5, read:false}, {id:2, title:'Plus que 1 an et 4 mois', body:'Ensuite, zéro impôt sur le revenu sur tes gains.', t: now - D*3, read:false}]},
    ct:{cash:850, deposits:10200, realized:1240, losses:340,
      positions:[ps('NQU','NQ','ETF Nasdaq 100','Actions US','blue',54,102.35,4183.88,1.2), ps('EMU','EM','ETF Émergents','Monde','orange',48,76.91,3374.47,0.4), ps('OBL','OB','ETF Obligations','Obligations','green',74,30.23,2250.52,-0.1)],
      history:[{t: now - D*9, kind:'sell', label:'Vente · 10 parts', detail:'ETF Nasdaq 100', amount:1012.4}, dep(33, 500)],
      plan:null, draft:{amount:50, asset:'NQU', roundups:false},
      notifs:[{id:1, title:'340 € de pertes à valoriser', body:'Elles réduisent l’impôt sur tes gains pendant 10 ans.', t: now - H*20, read:false}]},
    av:{deposits:16500, profile:'equilibre', alloc:{FE:60, MO:30, IM:10},
      positions:[sp('FE','€','Fonds euros','Sécurisé','blue',11052.45,10417.02,0.01), sp('MO','MO','ETF Monde','Unité de compte','orange',5526.23,4428.07,0.8), sp('IM','IM','Immobilier','Unité de compte','green',1842.07,1902.97,-0.1)],
      history:[{t: now - D*15, kind:'auto', label:'Versement programmé', detail:'Réparti 60 / 40', amount:100}, dep(120, 2000)],
      plan:null, draft:{amount:50, roundups:false},
      notifs:[{id:1, title:'Ta clause bénéficiaire est à jour', body:'2 personnes désignées. Tu peux la modifier quand tu veux.', t: now - D*6, read:false}]},
    per:{deposits:7000, year:3000, tmi:30, alloc:{MO:60, FE:25, OB:15},
      positions:[sp('MO','MO','ETF Monde','Unité de compte','orange',4716.18,3946.59,0.8), sp('FE','€','Fonds euros','Sécurisé','blue',1965.08,1919.02,0.01), sp('OB','OB','Obligations','Unité de compte','green',1179.04,1166.21,0.1)],
      history:[{t: now - D*25, kind:'deposit', label:'Versement déductible', detail:'Réparti 60 / 25 / 15', amount:1000}],
      plan:null, draft:{amount:50, roundups:false},
      notifs:[{id:1, title:'Verse avant le 31 décembre', body:'Tes versements 2026 se déduisent de ton revenu imposable 2026.', t: now - H*8, read:false}]}
  }};
  ['pea','ct','av','per'].forEach(k => { G.accounts[k].opened = true; G.accounts[k].openedAt = null; });
  G.accounts.pme = emptyAccount('pme');
  G.accounts.cc = emptyAccount('cc');
  return G;
}

/* ---------- read helpers ---------- */
const val = p => r2(p.value != null ? p.value : p.parts * p.price);
const held = p => !!p && val(p) > 0;
const totOf = a => r2(a.positions.reduce((s,p) => s + val(p), 0) + (a.cash || 0));
const pos = (acc, id) => acc.positions.find(p => p.id === id);
const common = G => r2(G.accounts.pea.deposits + G.accounts.pme.deposits);
function depositRoom(G, k){
  const a = G.accounts[k];
  if (k === 'pea') return Math.min(PEA_CAP - a.deposits, COMMON_CAP - common(G));
  if (k === 'pme') return COMMON_CAP - common(G);
  return Infinity;
}
const allocShort = (acc, k) => k === 'av' ? acc.alloc.FE + ' / ' + (100 - acc.alloc.FE) : Object.values(acc.alloc).join(' / ');
function splitAlloc(acc, x){
  const ids = Object.keys(acc.alloc); let left = x;
  return ids.map((id, i) => { const v = i === ids.length - 1 ? r2(left) : r2(x*acc.alloc[id]/100); left -= v; return {p: pos(acc, id), id, v}; });
}
function splitTxt(acc, k, x){
  const sp = splitAlloc(acc, x);
  if (k === 'av'){ const fe = sp.find(s => s.id === 'FE').v; return `${money(fe)} fonds euros · ${money(r2(x - fe))} UC`; }
  return sp.map(s => `${money(s.v)} ${SHORT[s.id] || s.p.name}`).join(' · ');
}
function stubPos(id){
  const m = mk(id);
  return m ? {id, ab:m.ab || id, name:m.name, sub:m.sub, tone:m.tone, parts:0, price:m.price, cost:0, day:m.day} : null;
}

/* ---------- dates / counters ---------- */
function monthsBetween(a, b){
  let m = (b.getFullYear() - a.getFullYear())*12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m--;
  return Math.max(0, m);
}
function ym(m){
  const y = Math.floor(m/12), mo = m % 12;
  const ys = y ? y + (y > 1 ? ' ans' : ' an') : '';
  const ms = mo ? mo + ' mois' : '';
  return ys && ms ? ys + ' et ' + ms : (ys || ms || 'moins d’un mois');
}
const openOf = (acc, k) => acc && acc.openedAt ? new Date(acc.openedAt) : PR[k].open;
function fiscal(k, acc){
  const pr = PR[k], now = new Date(), open = openOf(acc, k);
  const goal = pr.retire ? new Date(pr.retire, open.getMonth(), open.getDate()) : new Date(open.getFullYear() + (pr.years || 5), open.getMonth(), open.getDate());
  const p = Math.min(1, Math.max(0, (now - open) / (goal - open)));
  return {now, open, goal, p, done: now >= goal, elapsedTxt: ym(monthsBetween(open, now)).replace(' et ', ' '), leftTxt: ym(monthsBetween(now, goal)), leftYears: goal.getFullYear() - now.getFullYear()};
}


/* ---------- daily refresh, monthly plans ---------- */
const PLAN_MIN = 10, PLAN_MAX = 10000;
function fifthsBetween(after, until){
  const out = [], a = new Date(after);
  let y = a.getFullYear(), m = a.getMonth();
  for (let i = 0; i < 240; i++){
    const t = new Date(y, m, 5, 9, 0).getTime();
    if (t > until) break;
    if (t > after) out.push(t);
    if (++m > 11){ m = 0; y++; }
  }
  return out;
}
const roundupsFor = (k, t) => r2(4 + (hash(k + ':' + new Date(t).getFullYear() + '-' + new Date(t).getMonth()) % 1200) / 100);
function runPlan(G, k, t){
  const S = G.accounts[k], pr = PR[k], plan = S.plan, d = dayIndex(t);
  const extra = plan.roundups ? roundupsFor(k, t) : 0;
  let x = r2(plan.amount + extra);
  if (pr.kind === 'shares'){
    x = Math.min(x, depositRoom(G, k));
    if (x <= 0) return;
    const m = mk(plan.asset);
    S.cash = r2(S.cash + x); S.deposits = r2(S.deposits + x);
    let detail = 'Depuis ton compte courant';
    if (m){
      // Monthly payments add up in plan.pending until they cover a whole share.
      const price = priceAt(m, d), pot = r2((plan.pending || 0) + x), n = Math.floor(pot / price + 1e-9);
      if (n > 0){
        let a = pos(S, m.id);
        if (!a){ a = stubPos(m.id); S.positions.push(a); }
        a.parts += n; a.cost = r2(a.cost + n*price); S.cash = r2(S.cash - n*price);
        plan.pending = r2(pot - n*price);
        detail = `${n} ${n > 1 ? 'parts' : 'part'} ${de(m.name)} achetée${n > 1 ? 's' : ''}`;
      } else { plan.pending = pot; detail = `Mis de côté : ${eur(pot)} sur ${eur(price)} pour une part`; }
    }
    S.history.push({t, kind:'auto', label: extra ? 'Versement programmé + arrondis' : 'Versement programmé', detail, amount:x});
  } else {
    splitAlloc(S, x).forEach(s => { s.p.units += s.v / navAt(s.id, d); s.p.cost = r2(s.p.cost + s.v); });
    S.deposits = r2(S.deposits + x);
    if (k === 'per' && new Date(t).getFullYear() === new Date().getFullYear()) S.year = r2(S.year + x);
    S.history.push({t, kind:'auto', label: extra ? 'Versement programmé + arrondis' : 'Versement programmé', detail:'Réparti ' + allocShort(S, k), amount:x});
  }
  S.notifs.push({id:t, title:`${money(x)} ${pr.kind === 'shares' ? 'investis' : 'versés'} automatiquement`, body:`Ton versement du 5 sur ${lower(pr.name)} est passé.`, t, read:false});
  if (S.notifs.length > 30) S.notifs.splice(0, S.notifs.length - 30);
}
/* Brings a state up to date: migration, yearly counters, plans due since the last visit, today's prices.
   Returns true when something worth saving changed. */
function refresh(G, now){
  now = now == null ? clock() : now;
  const d = dayIndex(now), year = new Date(now).getFullYear();
  refreshMarket(d);
  let changed = false;
  if (!G.v || G.v < 3) ORDER.forEach(k => G.accounts[k].positions.forEach(p => { if (p.value != null && p.units == null) p.units = p.value / navAt(p.id, d); }));
  if (!G.v || G.v < 4) ORDER.forEach(k => { if (G.accounts[k].opened == null) G.accounts[k].opened = true; });
  if (!G.bank){ G.bank = Object.assign({}, BANK); changed = true; }
  if (G.v !== 4){ G.v = 4; changed = true; }
  ORDER.forEach(k => {
    const S = G.accounts[k];
    if (k === 'per' && S.yearOf !== year){ if (S.yearOf != null) S.year = 0; S.yearOf = year; changed = true; }
    if (k === 'ct' && S.realizedYear !== year){ if (S.realizedYear != null) S.realized = 0; S.realizedYear = year; changed = true; }
    if (S.plan){
      const due = fifthsBetween(S.plan.lastRun || S.plan.since, now);
      due.forEach(t => runPlan(G, k, t));
      if (due.length){ S.plan.lastRun = due[due.length - 1]; changed = true; }
    }
    S.positions.forEach(p => {
      if (p.units != null){
        const v = navAt(p.id, d), y = navAt(p.id, d - 1);
        p.value = r2(p.units * v); p.day = Math.round((v/y - 1)*10000)/100;
      } else {
        const m = mk(p.id);
        if (m){ p.price = m.price; p.day = m.day; }
      }
    });
  });
  return changed;
}

/* ---------- quotes (aperçu d'une opération) ---------- */
const MODES = {shares:['buy','sell','deposit','cashout'], contract:['verse','withdraw','arb','simulate']};
/* On a PEA or PEA-PME, any withdrawal before 5 years closes the plan. */
const cashoutOpen = (G, k) => k === 'ct' || fiscal(k, G.accounts[k]).done;
function quote(G, k, o){
  const S = G.accounts[k], x = o.x;
  switch (o.mode){
    case 'cashout': {
      if (!cashoutOpen(G, k)) return {x, ok:false, warn:true, pill:'Avant 5 ans, un retrait ferme le plan', btn:'Retrait impossible sans clôture'};
      const over = x > S.cash;
      return {x, ok: x > 0 && !over, warn: over, pill: over ? 'Plus que tes liquidités' : x > 0 ? 'Vers ' + bankOf(G).name.toLowerCase() : 'Retrait de liquidités',
        btn: x <= 0 ? 'Saisis un montant' : over ? 'Montant trop élevé' : 'Retirer ' + money(x)};
    }
    case 'deposit': {
      const room = depositRoom(G, k), over = x > room;
      return {x, ok: x > 0 && !over, warn: over, room, pill: over ? 'Au-delà du plafond' : x > 0 ? 'Versement depuis ton compte' : 'Saisis un montant',
        btn: x <= 0 ? 'Saisis un montant' : over ? 'Plafond dépassé' : 'Verser ' + money(x)};
    }
    case 'verse': {
      const per = k === 'per';
      return {x, ok: x > 0, pill: x <= 0 ? (per ? 'Économie d’impôt estimée' : 'Répartition automatique') : per ? `≈ ${eur0(x*S.tmi/100)} d’impôt en moins` : splitTxt(S, k, x),
        btn: x <= 0 ? 'Saisis un montant' : 'Verser ' + money(x)};
    }
    case 'simulate':
      return {x, ok: x > 0, pill: x > 0 ? `≈ ${eur0(x*S.tmi/100)} d’impôt en moins` : 'Économie d’impôt estimée', btn: x > 0 ? 'Verser ce montant' : 'Saisis un montant'};
    case 'withdraw': {
      const over = x > totOf(S);
      return {x, ok: x > 0 && !over, warn: over, pill: over ? 'Plus que ton épargne' : x > 0 ? 'Ton contrat reste ouvert' : 'Retrait partiel',
        btn: x <= 0 ? 'Saisis un montant' : over ? 'Montant trop élevé' : 'Retirer ' + money(x)};
    }
    case 'arb': {
      const from = pos(S, o.asset), to = pos(S, o.to);
      if (!from || !to) return {x, ok:false, warn:true, from: from || S.positions[0], to: to || S.positions[0], pill:'Choisis deux supports', btn:'Choisis deux supports'};
      const over = x > val(from), same = from === to;
      return {x, from, to, ok: x > 0 && !over && !same, warn: over || same,
        pill: same ? 'Choisis deux supports différents' : over ? 'Max ' + eur(val(from)) : `${from.name} → ${to.name}`,
        btn: x <= 0 ? 'Saisis un montant' : over ? 'Montant trop élevé' : 'Arbitrer ' + money(x)};
    }
    case 'buy': case 'sell': {
      const a = pos(S, o.asset) || (o.mode === 'buy' ? stubPos(o.asset) : null);
      if (!a) return {x, ok:false, warn:true, pill:'Placement introuvable', btn:'Placement introuvable'};
      const n = Math.floor(x / a.price + 1e-9), cost = r2(n * a.price), rest = r2(x - cost);
      if (o.mode === 'buy'){
        const over = x > S.cash, eligible = !mk(a.id) || elig(mk(a.id), k);
        return {a, x, n, cost, rest, ok: n > 0 && !over && eligible, warn: over || !eligible,
          pill: !eligible ? 'Pas éligible sur ce compte' : over ? 'Plus que ton disponible' : n === 0 ? 'Moins d’une part' : '≈ ' + n + (n>1?' parts':' part'),
          btn: !eligible ? 'Pas éligible sur ce compte' : over ? 'Montant trop élevé' : n === 0 ? 'Saisis un montant' : 'Acheter ' + n + (n>1?' parts':' part')};
      }
      const over = n > a.parts;
      return {a, x, n, cost, rest, ok: n > 0 && !over, warn: over,
        pill: over ? 'Tu as ' + a.parts + ' parts au maximum' : n === 0 ? 'Moins d’une part' : '≈ ' + n + (n>1?' parts':' part'),
        btn: over ? 'Montant trop élevé' : n === 0 ? 'Saisis un montant' : 'Vendre ' + n + (n>1?' parts':' part')};
    }
  }
  return {x, ok:false, pill:'', btn:'Opération inconnue'};
}

/* What closing a stock account would transfer: placements sold at today's price, plus cash. */
function closingOf(G, k){
  const S = G.accounts[k], sold = r2(S.positions.reduce((a,p) => a + val(p), 0)), cost = r2(S.positions.reduce((a,p) => a + p.cost, 0));
  return {sold, cash: S.cash, total: r2(sold + S.cash), gains: r2(Math.max(0, sold - cost))};
}

/* ---------- apply (le serveur fait foi) ---------- */
class OpError extends Error {}
const fail = msg => { throw new OpError(msg); };
const str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= (max || 40) ? v : null;
function accountOf(G, op){
  const k = op.account == null ? G.active : op.account;
  if (!ORDER.includes(k)) fail('Compte inconnu.');
  return k;
}
function cleanAmount(v){
  const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  if (typeof x !== 'number' || !isFinite(x) || x <= 0) fail('Saisis un montant positif.');
  if (x > MAX_AMOUNT) fail('Montant trop élevé.');
  return r2(x);
}
function order(G, k, op){
  const S = G.accounts[k], pr = PR[k], ton = pr.ton, now = Date.now();
  const mode = str(op.mode, 12);
  if (!mode || !MODES[pr.kind].includes(mode) || mode === 'simulate' || (mode === 'withdraw' && k !== 'av') || (mode === 'arb' && k !== 'cc'))
    fail('Opération impossible sur ce compte.');
  const x = cleanAmount(op.amount);
  const o = {mode, x, asset: str(op.asset, 8), to: str(op.to, 8)};
  const q = quote(G, k, o);
  if (!q.ok) fail(q.btn === 'Saisis un montant' ? 'Montant insuffisant.' : q.pill || q.btn);
  switch (mode){
    case 'cashout': {
      const before = totOf(S);
      S.cash = r2(S.cash - x);
      S.deposits = r2(S.deposits * (1 - x / before));
      const b = bankOf(G);
      S.history.push({t:now, kind:'cashout', label:'Virement vers ton compte courant', detail:`${b.name} · ${maskIban(b.iban)}`, amount:-x});
      return {line1: money(x) + ' virés vers ton compte courant', line2: `Ils arrivent sous 1 à 2 jours ouvrés sur ${maskIban(b.iban)}. Tes liquidités : ${eur(S.cash)}.`, toast: money(x) + ' virés vers ton compte courant'};
    }
    case 'deposit':
      S.cash = r2(S.cash + x); S.deposits = r2(S.deposits + x);
      S.history.push({t:now, kind:'deposit', label:'Versement', detail:'Depuis ton compte courant', amount:x});
      return {line1: money(x) + ' versés sur ' + ton, line2: 'Tes liquidités : ' + eur(S.cash) + '.', toast: '+' + money(x) + ' sur ' + ton};
    case 'verse': {
      const sp = splitAlloc(S, x);
      sp.forEach(s => { const nav = navAt(s.id, dayIndex()); s.p.units += s.v / nav; s.p.value = r2(s.p.units * nav); s.p.cost = r2(s.p.cost + s.v); });
      S.deposits = r2(S.deposits + x);
      let line2;
      if (k === 'per'){ S.year = r2(S.year + x); line2 = `Jusqu’à ${eur0(x*S.tmi/100)} d’impôt en moins sur tes revenus ${new Date().getFullYear()} (tranche à ${S.tmi} %).`; }
      else if (k === 'av'){ const fe = sp.find(s => s.id === 'FE').v; line2 = `${money(fe)} sur le fonds euros, ${money(r2(x - fe))} en unités de compte.`; }
      else line2 = sp.map(s => `${money(s.v)} ${/^ETF/.test(s.p.name) ? s.p.name : lower(s.p.name)}`).join(', ') + '.';
      S.history.push({t:now, kind:'deposit', label: k === 'per' ? 'Versement déductible' : 'Versement', detail:'Réparti ' + allocShort(S, k), amount:x});
      return {line1: money(x) + ' versés sur ' + ton, line2, toast: '+' + money(x) + ' sur ' + ton};
    }
    case 'withdraw': {
      const ratio = x / totOf(S);
      S.positions.forEach(p => { p.units *= (1 - ratio); p.value = r2(p.value*(1 - ratio)); p.cost = r2(p.cost*(1 - ratio)); });
      S.deposits = r2(S.deposits*(1 - ratio));
      S.history.push({t:now, kind:'withdraw', label:'Retrait', detail:'Vers ton compte courant', amount:-x});
      return {line1: money(x) + ' retirés de ' + ton, line2: 'L’argent arrive sur ton compte courant. Ton contrat reste ouvert.', toast: money(x) + ' retirés de ' + ton};
    }
    case 'arb': {
      const {from, to} = q;
      const d = dayIndex();
      from.cost = r2(from.cost*(1 - x/val(from))); from.units -= x / navAt(from.id, d); from.value = r2(from.value - x);
      to.units += x / navAt(to.id, d); to.value = r2(to.value + x); to.cost = r2(to.cost + x);
      S.history.push({t:now, kind:'arb', label:'Arbitrage', detail:`${from.name} → ${to.name}`, amount:x});
      return {line1: money(x) + ' arbitrés', line2: `De ${from.name} vers ${/^ETF/.test(to.name) ? to.name : lower(to.name)}. Pas d’impôt : l’argent reste dans ton contrat.`, toast: money(x) + ' arbitrés vers ' + to.name};
    }
    case 'buy': {
      let a = pos(S, q.a.id);
      if (!a){ a = stubPos(q.a.id); S.positions.push(a); }
      a.parts += q.n; a.cost = r2(a.cost + q.cost); S.cash = r2(S.cash - q.cost);
      S.history.push({t:now, kind:'buy', label:'Achat · ' + q.n + (q.n>1?' parts':' part'), detail:a.name, amount:-q.cost});
      return {line1: `${q.n} ${q.n>1?'parts':'part'} ${de(a.name)} ${q.n>1?'achetées':'achetée'} pour ${eur(q.cost)}`, line2: `Il te reste ${eur(S.cash)} de liquidités.`, toast: `+${q.n} ${q.n>1?'parts':'part'} ${de(a.name)} dans ${ton}`};
    }
    case 'sell': {
      const a = q.a, basis = r2(a.cost * q.n / a.parts), pnl = r2(q.cost - basis);
      if (S.realized != null){ if (pnl >= 0) S.realized = r2(S.realized + pnl); else S.losses = r2(S.losses - pnl); }
      a.cost = r2(a.cost - basis); a.parts -= q.n; S.cash = r2(S.cash + q.cost);
      S.history.push({t:now, kind:'sell', label:'Vente · ' + q.n + (q.n>1?' parts':' part'), detail:a.name, amount:q.cost});
      return {line1: `${q.n} ${q.n>1?'parts':'part'} ${de(a.name)} ${q.n>1?'vendues':'vendue'} pour ${eur(q.cost)}`,
        line2: (S.realized != null ? `${pnl >= 0 ? 'Plus-value' : 'Moins-value'} de ${eur(Math.abs(pnl))}. ` : '') + `Tes liquidités passent à ${eur(S.cash)}. ${pr.vaut} toujours ${eur(totOf(S))} : tes parts sont devenues des liquidités.`,
        toast: `${eur(q.cost)} ajoutés à tes liquidités`};
    }
  }
}
/* Applies one operation to the state G (mutated in place). Returns the confirmation texts, or throws OpError. */
function apply(G, op){
  if (!op || typeof op !== 'object') fail('Opération invalide.');
  const k = accountOf(G, op), S = G.accounts[k], pr = PR[k];
  refresh(G);
  if (!S.opened && !['openAccount', 'fav', 'reset'].includes(op.type)) fail('Ouvre d’abord ce compte.');
  switch (op.type){
    case 'order': return order(G, k, op);
    case 'switch': G.active = k; return null;
    case 'closeAccount': {
      if (pr.kind !== 'shares') fail('Ce compte ne se clôture pas ici.');
      const c = closingOf(G, k), b = bankOf(G);
      G.accounts[k] = emptyAccount(k);
      if (G.active === k) G.active = ORDER.find(o => G.accounts[o].opened) || 'pea';
      const Ton = pr.ton.charAt(0).toUpperCase() + pr.ton.slice(1);
      return {line1: `${money(c.total)} virés vers ton compte courant`,
        line2: `${Ton} est clôturé. L’argent arrive sous 1 à 2 jours ouvrés sur ${maskIban(b.iban)}. Tu pourras en rouvrir un depuis l’accueil.`,
        toast: `${Ton} est clôturé`, hub:true};
    }
    case 'openAccount': {
      if (S.opened) fail('Ce compte est déjà ouvert.');
      const first = op.amount == null || op.amount === 0 ? 0 : cleanAmount(op.amount);
      if (pr.kind === 'shares' && first > depositRoom(G, k)) fail('Au-delà du plafond de versements.');
      S.opened = true; S.openedAt = Date.now(); G.active = k;
      S.history.push({t:Date.now(), kind:'open', label:'Ouverture du compte', detail:pr.name, amount:0});
      S.notifs.push({id:Date.now(), title:`${pr.ton.charAt(0).toUpperCase() + pr.ton.slice(1)} est ouvert`, body:'Bienvenue ! Tu peux verser et investir quand tu veux.', t:Date.now(), read:false});
      let line2 = 'Tu peux verser et investir quand tu veux.';
      if (first > 0) line2 = order(G, k, {mode: pr.kind === 'shares' ? 'deposit' : 'verse', amount:first}).line1 + '.';
      const Ton = pr.ton.charAt(0).toUpperCase() + pr.ton.slice(1);
      return {line1:`${Ton} est ouvert`, line2, toast:`${Ton} est ouvert`, enter:k};
    }
    case 'draft': {
      if (op.amount != null){
        if (typeof op.amount !== 'number' || !isFinite(op.amount) || op.amount < PLAN_MIN || op.amount > PLAN_MAX) fail(`Choisis un montant entre ${PLAN_MIN} et ${F0.format(PLAN_MAX)} € par mois.`);
        S.draft.amount = Math.round(op.amount);
      }
      if (op.roundups != null) S.draft.roundups = !!op.roundups;
      if (op.asset != null){
        const m = mk(op.asset);
        if (pr.kind !== 'shares' || !m || m.type !== 'etf' || !elig(m, k)) fail('Ce placement n’est pas disponible ici.');
        S.draft.asset = m.id;
      }
      return null;
    }
    case 'plan': {
      if (op.action === 'stop'){ S.plan = null; return {toast: pr.kind === 'shares' ? 'Plan automatique arrêté' : 'Versements programmés arrêtés'}; }
      if (op.action !== 'start') fail('Action invalide.');
      const sh = pr.kind === 'shares', name = sh ? (mk(S.draft.asset) || {}).name : lower(pr.name);
      S.plan = {amount:S.draft.amount, asset:S.draft.asset, roundups:S.draft.roundups, since:Date.now()};
      S.notifs.push({id:Date.now(), title: sh ? 'Plan automatique activé' : 'Versements programmés activés', body:`${S.plan.amount} € sur ${name}, le 5 de chaque mois.`, t:Date.now(), read:false});
      return {toast: `${S.plan.amount} € ${sh ? 'investis' : 'versés'} chaque 5 du mois`};
    }
    case 'profile': {
      if (k !== 'av' || typeof op.profile !== 'string' || !Object.prototype.hasOwnProperty.call(PROFILES, op.profile)) fail('Profil invalide.');
      const pf = PROFILES[op.profile]; S.profile = op.profile; S.alloc = Object.assign({}, pf.alloc);
      return {toast: `Profil ${lower(pf.label)} : ${S.alloc.FE} / ${100 - S.alloc.FE}`};
    }
    case 'tmi': if (k !== 'per' || !TMIS.includes(op.value)) fail('Tranche invalide.'); S.tmi = op.value; return null;
    case 'fav': {
      const m = mk(op.id); if (!m) fail('Placement introuvable.');
      const i = G.favs.indexOf(m.id); if (i < 0) G.favs.push(m.id); else G.favs.splice(i, 1);
      return {fav: i < 0};
    }
    case 'readNotifs': S.notifs.forEach(n => n.read = true); return null;
    case 'reset': { const fresh = defaults(G.firstName); Object.keys(G).forEach(key => delete G[key]); Object.assign(G, fresh); return {toast:'Démo réinitialisée'}; }
  }
  fail('Opération inconnue.');
}

return {setClock, BANK, bankOf, maskIban, cashoutOpen, closingOf, openOf, emptyAccount, DAY, ANCHOR, BACK, dayIndex, dateOf, priceAt, navAt, refreshSpec, refreshMarket, specSeries, navSeries, accountSeries, refresh, PLAN_MIN, PLAN_MAX, hash, rng,
  F0, F1, F2, eur, eur0, sgn, pct, tri, r2, money, lower, de,
  PR, ORDER, PROFILES, SHORT, PEA_CAP, COMMON_CAP, AMOUNTS, TMIS, MARKET, mk, elig,
  defaults, val, held, totOf, pos, common, depositRoom, allocShort, splitAlloc, splitTxt,
  monthsBetween, ym, fiscal, quote, apply, OpError};
});
