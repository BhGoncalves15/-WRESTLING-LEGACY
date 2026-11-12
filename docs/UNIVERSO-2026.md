# Universo de 2026

A Carreira Livre agora abre em 01/01/2026 com WWE Raw, SmackDown e NXT, AEW, NJPW, TNA, AAA, ROH e BWF. São sete empresas e nove agendas jogáveis. Cada rodada do mercado oferece três propostas de empresas distintas. A divisão, o OVR, a popularidade e a exigência de cada empresa influenciam as ofertas.

## Como rodar

```bash
git clone --branch feat/combate-duplas https://github.com/BhGoncalves15/-WRESTLING-LEGACY.git
cd ./-WRESTLING-LEGACY
npm ci
npm run dev
```

Abra a URL do Vite com Node.js 22.13 ou posterior.

## Elencos e calendário

O catálogo de abertura registra 292 lutadores e uma identidade por pessoa e associa cada participação a uma data e fonte. Participações cruzadas têm o mesmo ID. Por exemplo, Dominik Mysterio aparece no Raw e na AAA. Atribuições de escalação, OVR, estilos, alinhamentos e salários são parâmetros do jogo. Perfis refletem a evidência disponível. Informações biográficas e vínculos privados continuam em pesquisa.

A tela **Empresas** permite escolher cada agenda, buscar lutadores e consultar registros reais posteriores à abertura. O arquivo de 2026 e as observações posteriores servem de referência. As participações de 2026 nesses registros pertencem ao histórico real. Os elencos, as datas e os resultados da carreira evoluem pela simulação.

O **Calendário** inclui 14 datas anunciadas antes da abertura e 25 registros de eventos reais de 2026. A interface tem quatro vistas. Próximos traz shows recorrentes e especiais. Anunciados mostra datas que já eram públicas no início da carreira. Resultados mostra os cards que aconteceram no save. Arquivo real 2026 reúne eventos documentados para consulta. Eventos compartilhados da WWE recebem lutadores das brands participantes. Um lutador pode aparecer em várias agendas, com apenas um compromisso por dia de simulação.

## Campeonatos

O catálogo reúne as 72 entradas do Documento Mestre em 71 IDs. O AAA World Cruiserweight Championship tem um registro canônico e aparece nos filtros da WWE e da AAA. Cada cinturão tem formato, divisão, fonte e situação em 01/01/2026. O cinturão de Rookies da BWF começa vago. O TNA Knockouts Television Championship e o NJPW TAMASHII Openweight Championship aparecem como títulos posteriores. O estado inicial do Maremoto da BWF segue em apuração.

Quarenta e um cinturões individuais têm regras de Singles e campeão disponível para defesas simuladas. O jogador pode receber oportunidades após três vitórias e popularidade suficiente. A página **Campeonatos** apresenta o campeão atual, o reinado, as defesas e as mudanças ocorridas no save. A transferência para outra agenda libera cinturões em posse do jogador que pertenciam à agenda anterior.

Treze cinturões de duplas têm defesas e trocas de campeões nas sete empresas. O reinado é da dupla, independentemente de quem fez a finalização. O cinturão feminino de duplas da WWE aparece nas três brands, com disputas na agenda do Raw e nos seus eventos compartilhados. Dion Lennox e Osiris Griffin representam o DarkState na abertura. Ángel de Oro e Niebla Roja entram no elenco jogável da NJPW pela participação no cinturão STRONG, e Brian Racer entra no elenco da BWF pelo reinado com Christopher.

O IWGP Junior Heavyweight Tag Team Championship, o NJPW TAMASHII Tag Team Championship, o cinturão misto da AAA, os trios e os formatos individuais especiais ficam disponíveis para consulta histórica. Suas disputas dependem das regras específicas de cada divisão ou circuito.

## Lutas de duplas

Em **Meu lutador**, escolha um parceiro disponível da sua divisão e brand. A parceria prioriza lutas de duplas e permite desafiar os campeões depois de duas vitórias juntos e popularidade de pelo menos 14. Uma defesa individual agendada tem prioridade. A parceria fica registrada quando o contrato vence e volta aos cards se você assinar com a mesma brand. Encerrar a dupla ou mudar de brand libera os títulos em posse dos dois.

Cada lado tem um lutador legal. Uma tag exige que o lutador no ringue esteja em pé, stamina dos dois integrantes e dois turnos entre trocas. Quem fica no apron recupera stamina. Quando seu parceiro entra, ele luta pela IA. Você pode acompanhar, pedir para voltar ou tentar interromper um pinfall ou submissão, uma vez por dupla. A vitória e a derrota valem para os dois integrantes. O calendário registra quem finalizou.

## Compatibilidade

A versão 3 abre e importa saves das versões 1 e 2. O calendário das novas empresas começa a avançar a partir da data corrente dos saves do piloto. Turno da luta, contratos, pagamentos, XP, atributos e resultados anteriores permanecem no arquivo. Em lutas de duplas, o save guarda o lutador legal de cada lado, os recursos dos quatro participantes e os salvamentos já usados.

O recorte de abertura e o arquivo de 2026 estão em expansão conforme as fontes são conferidas. O catálogo atual guarda fontes ao lado dos dados. Os comandos de testes e os perfis de navegador estão no [guia do piloto](PILOTO.md#como-rodar).

## Verificação da etapa de duplas

Os 44 testes do motor e do armazenamento cobrem troca de lutador legal, salvamento do parceiro, defesas, pagamento, vacância, conflito de agenda e importação. Três carreiras, uma por dificuldade, foram simuladas até janeiro de 2029. Cada uma gerou de 357 a 373 lutas de duplas, disputou os 13 cinturões e passou pela exportação e reimportação do save.
