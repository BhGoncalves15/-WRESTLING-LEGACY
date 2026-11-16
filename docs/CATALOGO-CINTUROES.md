# Catálogo de cinturões do Wrestling Legacy

As três referências fornecidas mostram o Undisputed WWE Championship, o World Heavyweight Championship e o WWE United States Championship de frente, abertos e centralizados. A composição usa um enquadramento horizontal de 5:2, fundo branco e preservação da proporção da imagem. O mesmo quadro é usado na galeria, no histórico visual, nos perfis, na prévia da unificação, na luta e no resultado. A edição é resolvida no catálogo pelo ID do título, pela data e, quando aplicável, pela luta que concluiu a unificação.

## Cobertura do catálogo

Os 71 títulos cadastrados têm um WebP próprio na edição de referência. São 61 peças modeladas e renderizadas no Blender e 10 representações originais de estúdio. Os arquivos ficam em `public/belts/catalog/` e são incluídos no ZIP para jogar offline.

A versão anterior só procurava uma fotografia válida na data da carreira. Quando a busca voltava vazia, devolvia o quadro **Foto de catálogo pendente**. Os arquivos 3D já disponíveis só atendiam a edições fictícias e mudanças de linhagem. As imagens de referência agora são resolvidas pelo ID do título. A galeria, o elenco, o perfil, a luta e os resultados usam o mesmo catálogo.

## Fotografias

O jogo mantém duas fotografias licenciadas de edições históricas. A réplica WWE de 2014 está em **Undisputed WWE Championship → Histórico visual**. O cinturão de tira vermelha da AAA está em **AAA World Mixed Tag Team Championship → Histórico visual**. Para ver os autores, as licenças e os originais, use o crédito ao lado da foto. [Fotografias e créditos](../public/belts/SOURCES.md)

Das 21 fotografias distribuídas na beta anterior, 19 ficaram fora desta versão porque mostravam lutadores, mãos, contexto de evento ou correias cortadas. A foto do NXT North American, por exemplo, mostra as mãos do árbitro e o ringue. A foto disponível do WWE United States no Commons mostra a placa de perto, sem a correia inteira. A foto da edição de 2004 do ROH World corta as duas pontas. Uma foto do Undisputed no Commons descreve o autor como desconhecido e informa ter vindo de uma busca. [NXT North American](https://commons.wikimedia.org/wiki/File:Referee_with_NXT_North_American_Championship.jpg) · [WWE United States](https://commons.wikimedia.org/wiki/File:New_US_Title.jpg) · [ROH World 2004](https://commons.wikimedia.org/wiki/File:ROH_World_Championship_2004.webp) · [Undisputed](https://commons.wikimedia.org/wiki/File:Undisputed_WWE_Championship.png)

As vitrines abaixo permitem consultar fotografias oficiais de réplicas. Os arquivos distribuídos exigem uma licença de reutilização da **fotografia**. Por exemplo, a loja WWE identifica suas fotos como conteúdo próprio ou licenciado. Nesta atualização, as fotos das vitrines serviram de referência visual. As 71 edições de abertura do jogo usam representações próprias. [Termos da loja WWE](https://shop.wwe.com/en/product-drop-terms-and-conditions/x-4346)

| Empresa | Fontes consultadas |
| --- | --- |
| WWE e NXT | [Undisputed](https://shop.wwe.com/en/undisputed-wwe-championship-replica-title-belt/p-356688230196121973) · [World Heavyweight](https://shop.wwe.com/en/wwe-world-heavyweight-championship-replica-title-belt/p-200116274) · [United States](https://shop.wwe.com/en/collectibles-and-toys/wwe-united-states-championship-replica-title-belt/d-5617346834%2Bf-8242196793%2Bz-7-3614840859?sku=17800200) · [Linhagens](https://www.wwe.com/titlehistory) |
| AEW | [Réplicas oficiais](https://shopaew.com/en-us/collections/title-belts) · [Histórico do AEW World](https://www.allelitewrestling.com/aew-world-championship-history) |
| TNA | [Réplica do TNA World](https://tnawrestling.com/news/now-available-officially-licensed-authentic-replica-tna-world-championship-belts) · [Elenco e campeões](https://tnawrestling.com/roster/) |
| NJPW | [Catálogo de campeões](https://www.njpw.co.jp/champions) · [Réplica oficial do IWGP World Heavyweight](https://www.njpw.co.jp/470271) |
| AAA | [Réplicas oficiais](https://shop.wwe.com/en/aaa/title-belts-and-accessories/t-9426601098%2Bd-123934595%2Bz-8-4025986010) · [Duplas mistas](https://shop.wwe.com/en/aaa-world-mixed-tag-team-championship-replica-title-belt/p-247747206818005147) |
| ROH | [Eventos e resultados](https://www.ringofhonor.com/) · [Referência visual de títulos](https://www.thesmackdownhotel.com/title-history/) |
| BWF | [Sul-Americano](https://bwf.com.br/sul-americano/) · [Histórico do Maremoto](https://bwf.com.br/maremoto-volta-a-bwf-em-show-no-proximo-sabado-conheca-sua-historia/) · [Elenco](https://bwf.com.br/lutadores/) |

## Edições criadas na carreira

São 32 modelos originais renderizados no Blender, exibidos offline em WebP de 1150 × 460. Cada uma das oito identidades visuais tem quatro modelos, para o título original, a unificação, a reformulação e a homenagem. As reformulações mudam o contorno e o acabamento da placa. As homenagens usam correias próprias, placas laterais adicionais e inscrição do campeão. Couro texturizado, costuras, fechos, placas chanfradas e esmalte respondem à iluminação de estúdio.

O jogo escolhe a peça pelo tipo de edição registrado na carreira. A unificação grava os nomes na placa e aplica às placas laterais motivos dos dois cinturões de origem. A prévia e a edição concluída usam a empresa que administra a linhagem. Um título fictício novo recebe a peça da empresa com o nome gravado. Títulos adicionados ao catálogo recebem ainda sua própria imagem pelo ID. Os IDs, reinados e formato de save continuam compatíveis com as betas anteriores. [Seleção central](../src/content/belt-catalog.ts) · [Fontes por ID](../src/content/belt-photos.ts)

## Manutenção e testes

Ao adicionar um título em `src/content/titles.ts`, cadastre o mesmo ID em `scripts/belt-catalog-designs.json` e inclua seu WebP em `public/belts/catalog/`. O gerador usa Blender. O empacotador converte os PNGs para WebP em 1150 × 460 e aceita artes selecionadas em uma pasta opcional. Os dois são ferramentas de manutenção do acervo e o jogo usa os WebPs já distribuídos. [Gerador](../scripts/render-belt-studio.py) · [Empacotador](../scripts/pack-belt-catalog.py)

A integração verifica acervo completo, cabeçalho, tamanho e assinatura de cada arquivo. O teste de navegador percorre os 71 títulos, decodifica os WebPs, confere dimensões, proporção, fundo e margem, aplica os filtros das nove agendas e compara os endereços com as imagens dos elencos. A suíte também cobre perfil, fotos locais, histórico, abertura da luta e resultado da unificação. [Testes de integração](../tests/beta-review.test.ts) · [Testes no jogo](../tests/browser/review.spec.ts)

## Usar uma foto autorizada neste navegador

Abra **Campeonatos**, escolha o título e, em **Histórico visual**, use **Adicionar foto autorizada do cinturão**. Escolha um arquivo JPG, PNG ou WebP frontal, com a peça inteira e fundo branco ou transparente. O jogo centraliza a fotografia em 1150 × 460 preservando a proporção. A imagem fica no navegador, aparece em todas as telas que usam a edição de referência e pode ser substituída ou removida ali mesmo. As fotos oficiais distribuídas e as edições simuladas têm prioridade nas versões a que pertencem.

As imagens adicionadas ficam em uma base local de mídia. Cada computador, endereço do jogo e navegador tem sua própria base. A carreira exportada leva os dados esportivos e as edições simuladas.

## Inventário das edições

| Empresa | Título | Imagem da edição de referência |
| --- | --- | --- |
| WWE Raw | World Heavyweight Championship | Arte de estúdio do jogo |
| WWE Raw | Women’s World Championship | Modelo 3D do jogo |
| WWE Raw | WWE Intercontinental Championship | Modelo 3D do jogo |
| WWE Raw | WWE Women’s Intercontinental Championship | Modelo 3D do jogo |
| WWE Raw | World Tag Team Championship | Modelo 3D do jogo |
| WWE SmackDown | Undisputed WWE Championship | Arte de estúdio do jogo · edição de 2014 no histórico |
| WWE SmackDown | WWE Women’s Championship | Modelo 3D do jogo |
| WWE SmackDown | WWE United States Championship | Arte de estúdio do jogo |
| WWE SmackDown | WWE Women’s United States Championship | Modelo 3D do jogo |
| WWE SmackDown | WWE Tag Team Championship | Modelo 3D do jogo |
| WWE Raw | WWE Women’s Tag Team Championship | Modelo 3D do jogo |
| NXT | NXT Championship | Arte de estúdio do jogo |
| NXT | NXT Women’s Championship | Modelo 3D do jogo |
| NXT | NXT North American Championship | Modelo 3D do jogo |
| NXT | NXT Women’s North American Championship | Modelo 3D do jogo |
| NXT | NXT Tag Team Championship | Modelo 3D do jogo |
| AEW | AEW World Championship | Arte de estúdio do jogo |
| AEW | AEW International Championship | Modelo 3D do jogo |
| AEW | AEW Continental Championship | Modelo 3D do jogo |
| AEW | AEW National Championship | Modelo 3D do jogo |
| AEW | AEW TNT Championship | Modelo 3D do jogo |
| AEW | AEW World Tag Team Championship | Modelo 3D do jogo |
| AEW | AEW World Trios Championship | Modelo 3D do jogo |
| AEW | AEW Women’s World Championship | Modelo 3D do jogo |
| AEW | AEW TBS Championship | Modelo 3D do jogo |
| AEW | AEW Women’s World Tag Team Championship | Modelo 3D do jogo |
| NJPW | IWGP World Heavyweight Championship | Arte de estúdio do jogo |
| NJPW | IWGP Global Heavyweight Championship | Modelo 3D do jogo |
| NJPW | IWGP Junior Heavyweight Championship | Modelo 3D do jogo |
| NJPW | IWGP Tag Team Championship | Modelo 3D do jogo |
| NJPW | IWGP Junior Heavyweight Tag Team Championship | Modelo 3D do jogo |
| NJPW | IWGP Women’s Championship | Modelo 3D do jogo |
| NJPW | NEVER Openweight Championship | Modelo 3D do jogo |
| NJPW | NEVER Openweight 6-Man Tag Team Championship | Modelo 3D do jogo |
| NJPW | NJPW World Television Championship | Modelo 3D do jogo |
| NJPW | STRONG Openweight Championship | Modelo 3D do jogo |
| NJPW | STRONG Openweight Tag Team Championship | Modelo 3D do jogo |
| NJPW | STRONG Women’s Championship | Modelo 3D do jogo |
| NJPW | NJPW TAMASHII Openweight Championship | Modelo 3D do jogo |
| NJPW | NJPW TAMASHII Tag Team Championship | Modelo 3D do jogo |
| TNA | TNA World Championship | Arte de estúdio do jogo |
| TNA | TNA International Championship | Modelo 3D do jogo |
| TNA | TNA X Division Championship | Modelo 3D do jogo |
| TNA | TNA World Tag Team Championship | Modelo 3D do jogo |
| TNA | TNA Knockouts World Championship | Modelo 3D do jogo |
| TNA | TNA Knockouts Television Championship | Modelo 3D do jogo |
| TNA | TNA Knockouts World Tag Team Championship | Modelo 3D do jogo |
| AAA | AAA Mega Championship | Arte de estúdio do jogo |
| AAA | AAA Latin American Championship | Modelo 3D do jogo |
| AAA | AAA World Cruiserweight Championship | Modelo 3D do jogo |
| AAA | AAA Reina de Reinas Championship | Modelo 3D do jogo |
| AAA | AAA World Tag Team Championship | Modelo 3D do jogo |
| AAA | AAA World Trios Championship | Modelo 3D do jogo |
| AAA | AAA World Mixed Tag Team Championship | Modelo 3D do jogo · edição vermelha no histórico |
| ROH | ROH World Championship | Arte de estúdio do jogo |
| ROH | ROH World Television Championship | Modelo 3D do jogo |
| ROH | ROH Pure Championship | Modelo 3D do jogo |
| ROH | ROH World Tag Team Championship | Modelo 3D do jogo |
| ROH | ROH World Six-Man Tag Team Championship | Modelo 3D do jogo |
| ROH | ROH Women’s World Championship | Modelo 3D do jogo |
| ROH | ROH Women’s World Television Championship | Modelo 3D do jogo |
| ROH | ROH Women’s Pure Championship | Modelo 3D do jogo |
| BWF | Campeonato Brasileiro da BWF | Modelo 3D do jogo |
| BWF | Campeonato Sul-Americano da BWF | Modelo 3D do jogo |
| BWF | BWF Rei do Ringue | Modelo 3D do jogo |
| BWF | Campeonato de Duplas da BWF | Modelo 3D do jogo |
| BWF | Campeão Supremo | Modelo 3D do jogo |
| BWF | Campeonato Internet | Modelo 3D do jogo |
| BWF | Campeonato Sobrevivente | Modelo 3D do jogo |
| BWF | Campeonato de Rookies da BWF | Modelo 3D do jogo |
| BWF | Campeonato Maremoto | Arte de estúdio do jogo |
