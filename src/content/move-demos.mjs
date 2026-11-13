// Poses originais para as demonstrações. Coordenadas do quadril, rotação e postura.
const p = (x, y = 144, rotation = 0, posture = 'stand') => [x, y, rotation, posture]
const stand = p(104), rival = p(210)
const f = (time, attacker, defender, caption = '') => ({ time, attacker, defender, caption })

export const demos = {
  jab: [f(0, p(140), p(202)), f(1, p(155, 144, 0, 'punch'), p(205, 144, -12), 'Soco direto'), f(2.4, p(140), p(210))],
  chop: [f(0, p(141, 144, -18, 'wind'), p(202)), f(1, p(155, 144, 9, 'chop'), p(205, 144, -18), 'Mão aberta no peito'), f(2.4, p(142), p(216))],
  kick: [f(0, p(140), p(206)), f(1, p(156, 146, -10, 'lowkick'), p(205, 150, 10, 'kneel'), 'Chute baixo'), f(2.4, p(145), p(219))],
  dropkick: [f(0, stand, rival), f(.8, p(144, 132, -64, 'tuck'), rival), f(1.4, p(165, 117, -90, 'drop'), p(215, 151, -34), 'Os dois pés atingem o peito'), f(2.4, p(141, 170, -90, 'tuck'), p(231, 174, -90))],
  european: [f(0, p(142, 153, 8, 'kneel'), p(204)), f(1.1, p(158, 139, 12, 'upper'), p(207, 145, -23), 'Antebraço de baixo para cima'), f(2.4, p(146), p(226))],
  clothesline: [f(0, stand, rival), f(.8, p(144, 143, 12, 'run'), rival), f(1.3, p(176, 143, 8, 'bar'), p(209, 152, -42), 'Braço estendido'), f(2.4, p(191), p(238, 174, -90))],
  suplex: [f(0, p(143, 144, 6, 'grab'), p(198, 145, -28, 'grab')), f(.9, p(156, 144, 0, 'over'), p(166, 81, 180), 'Levantamento vertical'), f(1.7, p(135, 159, -64, 'over'), p(112, 112, 112)), f(2.5, p(135, 172, -90), p(95, 174, -90))],
  slam: [f(0, p(143, 144, 6, 'grab'), p(201, 145, -22)), f(.9, p(163, 144, 0, 'scoop'), p(182, 105, 98, 'tuck'), 'Apoio no tronco e nas pernas'), f(1.6, p(180, 145, 25, 'grab'), p(215, 142, 86)), f(2.5, p(168), p(226, 174, 90))],
  powerslam: [f(0, p(121, 144, 0, 'grab'), p(240, 144, 18, 'run')), f(.9, p(168, 143, 5, 'scoop'), p(169, 103, -70, 'tuck')), f(1.55, p(202, 152, 75, 'grab'), p(216, 163, -88), 'Queda junto com o rival'), f(2.5, p(199, 161, 89), p(230, 174, -90))],
  forearm: [f(0, stand, rival), f(.8, p(143, 144, 15, 'run'), rival), f(1.3, p(171, 137, 22, 'upper'), p(215, 146, -27), 'Antebraço em corrida'), f(2.4, p(178), p(232, 162, -50))],
  armdrag: [f(0, p(141, 144, 0, 'grab'), p(199, 144, 0, 'punch')), f(.9, p(147, 150, 24, 'kneel'), p(159, 105, -76, 'punch'), 'Puxada pelo braço'), f(1.55, p(141, 153, 8, 'grab'), p(123, 143, -142, 'tuck')), f(2.5, p(154), p(92, 174, 90))],
  snapmare: [f(0, p(148, 144, 0, 'over'), p(126, 144, 0, 'turn')), f(.8, p(172, 158, 22, 'grab'), p(177, 104, -88, 'tuck'), 'Giro à frente pelo ombro'), f(1.6, p(169, 158, 15, 'kneel'), p(218, 155, -48, 'sit')), f(2.5, p(168), p(221, 164, 0, 'sit'))],
  leglock: [f(0, p(177, 152, 12, 'grab'), p(226, 173, 90)), f(.85, p(177, 166, -60, 'scoop'), p(223, 174, 90, 'oneleg')), f(1.6, p(167, 171, -87, 'tuck'), p(216, 174, 90, 'oneleg'), 'Chave na linha do joelho'), f(2.6, p(167, 171, -87, 'tuck'), p(216, 174, 90, 'oneleg'))],
  backbreaker: [f(0, p(139, 144, 0, 'grab'), p(199)), f(.9, p(160, 144, 0, 'scoop'), p(180, 100, -90)), f(1.6, p(167, 155, 0, 'kneel'), p(182, 138, -90, 'arch'), 'As costas passam sobre o joelho'), f(2.5, p(167, 155, 0, 'kneel'), p(209, 172, -90))],
  crossbody: [f(0, p(79, 84, 0, 'kneel'), p(226)), f(.8, p(130, 84, 52, 'bar'), p(224)), f(1.5, p(202, 120, 87, 'bar'), p(224, 149, -35), 'Corpo atravessado sobre o rival'), f(2.5, p(218, 159, 90), p(238, 174, -90))],
  moonsault: [f(0, p(77, 83, 0, 'turn'), p(203, 174, -90)), f(.6, p(111, 54, 65, 'over'), p(203, 174, -90)), f(1.05, p(151, 53, 176, 'tuck'), p(203, 174, -90), 'Salto mortal para trás'), f(1.48, p(183, 91, 295, 'tuck'), p(203, 174, -90)), f(2.4, p(195, 157, 450), p(203, 174, -90))],
  elbow: [f(0, p(79, 84, 0, 'kneel'), p(205, 174, -90)), f(.8, p(137, 79, -22, 'upper'), p(205, 174, -90)), f(1.55, p(196, 146, -74, 'elbow'), p(205, 174, -90), 'Cotovelada da terceira corda'), f(2.5, p(203, 161, -83, 'elbow'), p(205, 174, -90))],
  duck: [f(0, p(136), p(212, 144, 0, 'bar')), f(.7, p(163, 157, 17, 'kneel'), p(197, 143, 10, 'bar'), 'Esquiva sob o braço'), f(1.4, p(157, 144, 8, 'elbow'), p(196, 149, -23), 'Resposta de cotovelo'), f(2.4, p(155), p(219))],
  backdrop: [f(0, p(145), p(231, 144, 10, 'run')), f(.8, p(158, 151, 38, 'kneel'), p(199, 133, -45, 'grab')), f(1.3, p(166, 141, 12, 'over'), p(161, 70, -150, 'tuck'), 'Projeção por cima das costas'), f(2.4, p(177), p(104, 174, -90))],
  wristlock: [f(0, p(139, 144, 0, 'grab'), p(198, 144, 0, 'punch')), f(.85, p(144, 143, 0, 'over'), p(194, 150, -22, 'over'), 'Giro sob o braço'), f(1.6, p(148, 145, 0, 'grab'), p(193, 148, -23, 'grab'), 'Controle invertido do pulso'), f(2.4, p(148, 145, 0, 'grab'), p(193, 148, -23, 'grab'))],
  rollthrough: [f(0, p(147, 154, 6, 'kneel'), p(209, 102, -28, 'bar')), f(.7, p(157, 168, -80, 'tuck'), p(185, 132, -75, 'tuck')), f(1.4, p(185, 169, -220, 'tuck'), p(183, 159, -174, 'tuck'), 'Rolamento com a perna presa'), f(2.5, p(208, 157, -360, 'kneel'), p(183, 174, -270, 'oneleg'))],
  enzuigiri: [f(0, p(138, 144, 0, 'lowkick'), p(203, 144, 0, 'grab')), f(.8, p(157, 127, -32, 'tuck'), p(204, 144, 0, 'grab')), f(1.35, p(169, 120, -37, 'highkick'), p(207, 145, -27), 'Chute alto com a outra perna'), f(2.4, p(171, 169, -84), p(226, 174, -90))],
  ddt: [f(0, p(143, 144, 0, 'grab'), p(202, 146, -42, 'kneel')), f(.85, p(169, 144, 0, 'turn'), p(185, 139, -79, 'tuck'), 'Giro com a cabeça presa'), f(1.55, p(147, 158, -65, 'grab'), p(178, 143, -143, 'tuck')), f(2.5, p(143, 172, -90), p(188, 174, 90))],
  spinebuster: [f(0, p(128, 144, 0, 'grab'), p(226, 144, 14, 'run')), f(.9, p(164, 144, 4, 'scoop'), p(182, 103, -40, 'tuck'), 'Pegada na cintura'), f(1.5, p(182, 148, 22, 'grab'), p(202, 157, -86), 'Queda de costas'), f(2.4, p(179, 155, 15, 'kneel'), p(219, 174, -90))],
  german: [f(0, p(150, 144, 0, 'grab'), p(179, 144, 0, 'turn')), f(.8, p(145, 145, -32, 'grab'), p(152, 107, -57, 'tuck')), f(1.5, p(124, 163, -83, 'arch'), p(107, 140, -146, 'tuck'), 'Projeção para trás'), f(2.5, p(127, 164, -90, 'arch'), p(92, 173, -90, 'arch'), 'Ponte de finalização')],
  splash: [f(0, p(78, 84, 0, 'kneel'), p(203, 174, -90)), f(.7, p(130, 61, 44, 'tuck'), p(203, 174, -90), 'Encolhe braços e pernas'), f(1.3, p(173, 96, 80, 'bar'), p(203, 174, -90), 'Estende antes do impacto'), f(2.4, p(200, 157, 90, 'bar'), p(203, 174, -90))],
  cutter: [f(0, p(145), p(197)), f(.8, p(169, 126, 6, 'hook'), p(191, 140, 45, 'turn'), 'Salto com a cabeça presa'), f(1.5, p(171, 149, -61, 'hook'), p(181, 137, 95)), f(2.4, p(170, 171, -90), p(194, 174, 90))],
  powerbomb: [f(0, p(144, 144, 0, 'grab'), p(201, 147, -44, 'kneel')), f(.85, p(167, 144, 0, 'over'), p(185, 92, 0, 'sit'), 'Rival sentado sobre os ombros'), f(1.5, p(169, 163, 4, 'sit'), p(214, 140, -73, 'tuck')), f(2.4, p(169, 167, 0, 'sit'), p(222, 174, -90))],
  driver: [f(0, p(141, 144, 0, 'grab'), p(199)), f(.8, p(162, 144, 0, 'scoop'), p(168, 94, -80, 'arch'), 'Carregada nos ombros'), f(1.45, p(178, 163, 0, 'sit'), p(190, 132, 135, 'tuck'), 'Giro e queda sentada'), f(2.4, p(178, 168, 0, 'sit'), p(216, 174, 90))],
  spear: [f(0, p(82, 145, 8, 'run'), p(225)), f(.75, p(141, 145, 18, 'run'), p(222)), f(1.35, p(183, 143, 61, 'grab'), p(224, 147, -35), 'Ombro no abdômen'), f(2.4, p(199, 160, 88, 'grab'), p(232, 174, -90))],
}
