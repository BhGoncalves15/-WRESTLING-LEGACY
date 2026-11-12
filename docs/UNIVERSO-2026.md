# Universo de 2026

A Carreira Livre agora abre em 01/01/2026 com WWE Raw, SmackDown e NXT, AEW, NJPW, TNA, AAA, ROH e BWF. São sete empresas e nove agendas jogáveis. Cada rodada do mercado oferece três propostas de empresas distintas. A divisão, o OVR, a popularidade e a exigência de cada empresa influenciam as ofertas.

## Como rodar

```bash
git clone --branch feat/universo-sete-empresas https://github.com/BhGoncalves15/-WRESTLING-LEGACY.git
cd ./-WRESTLING-LEGACY
npm ci
npm run dev
```

Abra a URL do Vite com Node.js 22.13 ou posterior.

## Elencos e calendário

O catálogo de abertura registra 289 lutadores e uma identidade por pessoa e associa cada participação a uma data e fonte. Participações cruzadas têm o mesmo ID. Por exemplo, Dominik Mysterio aparece no Raw e na AAA. Atribuições de escalação, OVR, estilos, alinhamentos e salários são parâmetros do jogo. Perfis refletem a evidência disponível. Informações biográficas e vínculos privados continuam em pesquisa.

A tela **Empresas** permite escolher cada agenda, buscar lutadores e consultar registros reais posteriores à abertura. O arquivo de 2026 e as observações posteriores servem de referência. As participações de 2026 nesses registros pertencem ao histórico real. Os elencos, as datas e os resultados da carreira evoluem pela simulação.

O **Calendário** inclui 14 datas anunciadas antes da abertura e 25 registros de eventos reais de 2026. A interface tem quatro vistas. Próximos traz shows recorrentes e especiais. Anunciados mostra datas que já eram públicas no início da carreira. Resultados mostra os cards que aconteceram no save. Arquivo real 2026 reúne eventos documentados para consulta. Eventos compartilhados da WWE recebem lutadores das brands participantes. Um lutador pode aparecer em várias agendas, com apenas um compromisso por dia de simulação.

## Campeonatos

O catálogo reúne as 72 entradas do Documento Mestre em 71 IDs. O AAA World Cruiserweight Championship tem um registro canônico e aparece nos filtros da WWE e da AAA. Cada cinturão tem formato, divisão, fonte e situação em 01/01/2026. O cinturão de Rookies da BWF começa vago. O TNA Knockouts Television Championship e o NJPW TAMASHII Openweight Championship aparecem como títulos posteriores. O estado inicial do Maremoto da BWF segue em apuração.

Quarenta e um cinturões individuais têm regras de Singles e campeão disponível para defesas simuladas. O jogador pode receber oportunidades após três vitórias e popularidade suficiente. A página **Campeonatos** apresenta o campeão atual, o reinado, as defesas e as mudanças ocorridas no save. A transferência para outra agenda libera cinturões em posse do jogador que pertenciam à agenda anterior.

Duplas, trios, Pure, classes de peso e outros formatos especiais têm registros históricos com as respectivas regras identificadas. As disputas desses formatos dependem da expansão das regras de combate. Os especiais do calendário usam os formatos já disponíveis para seus cards.

## Compatibilidade

A versão 2 abre e importa saves do piloto. O calendário das novas empresas começa a avançar a partir da data corrente do save migrado. Turno da luta, contratos, pagamentos, XP, atributos e resultados anteriores permanecem no arquivo. Novas carreiras já começam com as nove agendas ativas.

O recorte de abertura e o arquivo de 2026 estão em expansão conforme as fontes são conferidas. O catálogo atual guarda fontes ao lado dos dados. Os comandos de testes e os perfis de navegador estão no [guia do piloto](PILOTO.md#como-rodar).
