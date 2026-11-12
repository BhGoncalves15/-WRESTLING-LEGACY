import { rosterGroup } from './roster-model'
import { SOURCES } from './sources'

export const WWE_ROSTER = [
  ...rosterGroup('raw', '2025-12-29', SOURCES.raw29, 'men', [
    ['cm-punk', 'CM Punk', 'All-Rounder', 23, 'Face'],
    ['bron-breakker', 'Bron Breakker', 'Powerhouse', 17, 'Heel'],
    ['gunther', 'Gunther', 'Powerhouse', 21, 'Heel'],
    ['austin-theory', 'Austin Theory', 'All-Rounder', 6, 'Heel'],
    ['rey-mysterio', 'Rey Mysterio', 'Highflyer', 16, 'Face'],
    ['r-truth', 'R-Truth', 'Brawler', -1, 'Face'],
    ['jey-uso', 'Jey Uso', 'Brawler', 14, 'Face'],
    ['jimmy-uso', 'Jimmy Uso', 'Brawler', 8, 'Face'],
    ['aj-styles', 'AJ Styles', 'All-Rounder', 17, 'Face'],
    ['dragon-lee', 'Dragon Lee', 'Highflyer', 8, 'Face'],
    ['penta', 'Penta', 'Highflyer', 13, 'Face'],
  ]),
  ...rosterGroup('raw', '2025-12-15', SOURCES.raw15, 'men', [
    ['kofi-kingston', 'Kofi Kingston', 'Highflyer', 13, 'Heel'],
    ['xavier-woods', 'Xavier Woods', 'All-Rounder', 10, 'Heel'],
  ]),
  ...rosterGroup('raw', '2025-12-08', SOURCES.raw08, 'men', [
    ['finn-balor', 'Finn Bálor', 'Highflyer', 16, 'Heel'],
    ['la-knight', 'LA Knight', 'Brawler', 15, 'Face'],
  ]),
  ...rosterGroup('raw', '2025-12-08', SOURCES.raw08, 'women', [
    ['roxanne-perez', 'Roxanne Perez', 'Technician', 12, 'Heel'],
    ['lyra-valkyria', 'Lyra Valkyria', 'Technician', 13, 'Face'],
  ]),
  ...rosterGroup('raw', '2025-12-22', SOURCES.raw22, 'men', [
    ['bronson-reed', 'Bronson Reed', 'Powerhouse', 10, 'Heel'],
  ]),
  ...rosterGroup('raw', '2025-11-29', SOURCES.wweSurvivor, 'men', [
    ['dominik-mysterio', 'Dominik Mysterio', 'All-Rounder', 12, 'Heel'],
    ['logan-paul', 'Logan Paul', 'Highflyer', 12, 'Heel'],
    ['roman-reigns', 'Roman Reigns', 'Powerhouse', 24, 'Face'],
  ]),
  ...rosterGroup('raw', '2025-12-29', SOURCES.raw29, 'women', [
    ['stephanie-vaquer', 'Stephanie Vaquer', 'Technician', 20, 'Face'],
    ['raquel-rodriguez', 'Raquel Rodriguez', 'Powerhouse', 13, 'Heel'],
    ['nikki-bella', 'Nikki Bella', 'All-Rounder', 10, 'Heel'],
    ['becky-lynch', 'Becky Lynch', 'Technician', 18, 'Heel'],
    ['maxxine-dupri', 'Maxxine Dupri', 'Submission Specialist', 5, 'Face'],
    ['rhea-ripley', 'Rhea Ripley', 'Powerhouse', 24, 'Face'],
    ['iyo-sky', 'IYO SKY', 'Highflyer', 20, 'Face'],
  ]),
  ...rosterGroup('raw', '2025-12-22', SOURCES.raw22, 'women', [
    ['asuka', 'Asuka', 'Submission Specialist', 19, 'Heel'],
    ['kairi-sane', 'Kairi Sane', 'Highflyer', 12, 'Heel'],
  ]),
  ...rosterGroup('raw', '2025-11-29', SOURCES.wweSurvivor, 'women', [
    ['liv-morgan', 'Liv Morgan', 'Brawler', 16, 'Heel'],
  ]),
  ...rosterGroup('smackdown', '2025-12-26', SOURCES.sd26, 'men', [
    ['cody-rhodes', 'Cody Rhodes', 'All-Rounder', 23, 'Face'],
    ['drew-mcintyre', 'Drew McIntyre', 'Powerhouse', 21, 'Heel'],
    ['carmelo-hayes', 'Carmelo Hayes', 'Highflyer', 12, 'Face'],
    ['ilja-dragunov', 'Ilja Dragunov', 'Brawler', 15, 'Face'],
    ['the-miz', 'The Miz', 'Brawler', 8, 'Heel'],
  ]),
  ...rosterGroup('smackdown', '2025-12-19', SOURCES.sd19, 'men', [
    ['dexter-lumis', 'Dexter Lumis', 'Brawler', 7, 'Tweener'],
    ['joe-gacy', 'Joe Gacy', 'Brawler', 7, 'Tweener'],
    ['jc-mateo', 'JC Mateo', 'Powerhouse', 9, 'Heel'],
    ['tonga-loa', 'Tonga Loa', 'Powerhouse', 5, 'Heel'],
    ['talla-tonga', 'Talla Tonga', 'Powerhouse', 8, 'Heel'],
    ['aleister-black', 'Aleister Black', 'Brawler', 13, 'Heel'],
    ['damian-priest', 'Damian Priest', 'Powerhouse', 16, 'Face'],
    ['johnny-gargano', 'Johnny Gargano', 'Technician', 11, 'Heel'],
    ['tommaso-ciampa', 'Tommaso Ciampa', 'Brawler', 11, 'Heel'],
  ]),
  ...rosterGroup('smackdown', '2025-10-24', SOURCES.sdOct24, 'men', [
    ['solo-sikoa', 'Solo Sikoa', 'Powerhouse', 14, 'Heel'],
    ['rey-fenix', 'Rey Fénix', 'Highflyer', 17, 'Face'],
  ]),
  ...rosterGroup('smackdown', '2025-09-12', SOURCES.sdSep12, 'men', [
    ['sami-zayn', 'Sami Zayn', 'All-Rounder', 17, 'Face'],
  ]),
  ...rosterGroup('smackdown', '2025-10-24', SOURCES.sdOct24, 'women', [
    ['tiffany-stratton', 'Tiffany Stratton', 'Highflyer', 16, 'Face'],
  ]),
  ...rosterGroup('smackdown', '2025-12-12', SOURCES.sd12, 'women', [
    ['zelina-vega', 'Zelina Vega', 'Highflyer', 10, 'Heel'],
  ]),
  ...rosterGroup('smackdown', '2025-12-26', SOURCES.sd26, 'women', [
    ['charlotte-flair', 'Charlotte Flair', 'All-Rounder', 21, 'Face'],
    ['lash-legend', 'Lash Legend', 'Powerhouse', 6, 'Heel'],
    ['alexa-bliss', 'Alexa Bliss', 'Brawler', 15, 'Face'],
    ['giulia', 'Giulia', 'Brawler', 13, 'Heel'],
    ['kiana-james', 'Kiana James', 'Technician', 2, 'Heel'],
    ['chelsea-green', 'Chelsea Green', 'Brawler', 11, 'Heel'],
    ['alba-fyre', 'Alba Fyre', 'Highflyer', 8, 'Heel'],
  ]),
  ...rosterGroup('smackdown', '2025-12-19', SOURCES.sd19, 'women', [
    ['nia-jax', 'Nia Jax', 'Powerhouse', 13, 'Heel'],
  ]),
  ...rosterGroup('smackdown', '2025-11-29', SOURCES.wweSurvivor, 'women', [
    ['jade-cargill', 'Jade Cargill', 'Powerhouse', 17, 'Tweener'],
  ]),
  ...rosterGroup('nxt', '2025-12-16', SOURCES.nxtDec16, 'men', [
    ['hank-walker', 'Hank Walker', 'Powerhouse', -2, 'Face'],
    ['tank-ledger', 'Tank Ledger', 'Powerhouse', -1, 'Face'],
    ['bronco-nima', 'Bronco Nima', 'Powerhouse', -3, 'Heel'],
    ['lucien-price', 'Lucien Price', 'Brawler', -3, 'Heel'],
    ['myles-borne', 'Myles Borne', 'Technician', 4, 'Face'],
    ['dion-lennox', 'Dion Lennox', 'Powerhouse', 2, 'Heel'],
    ['joe-hendry', 'Joe Hendry', 'All-Rounder', 9, 'Face'],
  ]),
  ...rosterGroup('nxt', '2025-10-25', SOURCES.nxtTag, 'men', [
    ['osiris-griffin', 'Osiris Griffin', 'Powerhouse', 1, 'Heel'],
    ['saquon-shugars', 'Saquon Shugars', 'Brawler', 1, 'Heel'],
  ]),
  ...rosterGroup('nxt', '2025-12-16', SOURCES.nxtDec16, 'women', [
    ['thea-hail', 'Thea Hail', 'Submission Specialist', 5, 'Face'],
    ['blake-monroe', 'Blake Monroe', 'Brawler', 11, 'Heel'],
    ['fallon-henley', 'Fallon Henley', 'Brawler', 6, 'Heel'],
    ['lainey-reid', 'Lainey Reid', 'All-Rounder', -2, 'Heel'],
  ]),
]
