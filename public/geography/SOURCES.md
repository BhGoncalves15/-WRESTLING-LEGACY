# Catálogo geográfico do Wrestling Legacy

Os arquivos `countries.json` e `places-*.json.gz` são uma base derivada distribuída sob a [Open Database License 1.0](ODbL.txt). Os nomes e códigos nacionais, subdivisões e localidades internacionais foram selecionados de [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database/tree/e9c4decaebe3c449bf5ed574a31d6d97bf21803c), de Darshan Gada e colaboradores. Foram mantidos IDs estáveis, nomes em português quando disponíveis e somente os campos usados pelo jogo.

Para o Brasil, a base usa os códigos oficiais do IBGE por meio de [Municípios Brasileiros](https://github.com/kelvins/municipios-brasileiros/tree/503e2f70bbf1b4b7ec0b1f68b09086ccc38fe861), de Kelvin S. do Prado e colaboradores. O aviso MIT está em [MIT-Brazil.txt](MIT-Brazil.txt). Para consultar os códigos oficiais, use [Localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades).

As bandeiras são de [Flag Icons 7.5.0](https://github.com/lipis/flag-icons/tree/v7.5.0), reduzidas para 24 × 18 e reunidas em uma imagem local. O aviso MIT está em [MIT-Flags.txt](MIT-Flags.txt).

Para reconstruir os arquivos, use Python com Pillow e Inkscape. Na raiz do repositório, execute `python scripts/prepare-geography.py CAMINHO_MUNDO CAMINHO_BRASIL CAMINHO_BANDEIRAS` apontando para as três cópias nas revisões listadas. Os arquivos de dados distribuídos são diretamente legíveis após descompactar o gzip.
