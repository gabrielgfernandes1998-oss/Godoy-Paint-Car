# Godoy Paint Car

Editor local de pinturas de viaturas GTA V Legacy/FiveM, baseado no [PAINTFIVE](https://github.com/gabrielgfernandes1998-oss/PAINTFIVE), revisão `5bc7e528fd6fcb1d56cc986125c241405fe884af`.

## Windows portable

Baixe o ZIP em [Releases](https://github.com/gabrielgfernandes1998-oss/Godoy-Paint-Car/releases), extraia **todos os arquivos** e abra `GodoyPaintCar.exe`. Não precisa instalar Node.js. Requer Windows 10/11 x64 e WebGL. O pacote é gerado em Linux; o executável ainda precisa de validação em Windows.

## Usar

1. Em **Importar modelo**, abra o `.yft` ou `_hi.yft` da viatura.
2. Em **Abrir dicionário YTD**, abra o `.ytd` correspondente. A pintura referenciada pelo modelo é selecionada automaticamente.
3. Escolha uma textura em **Texturas do dicionário**. Variações da mesma pintura (por exemplo `virgilio_sign_1` e `virgilio_sign_2`) são vinculadas à carroceria automaticamente. Para outros nomes, selecione o material em **Aplicar na viatura** e clique em **Vincular textura selecionada**. A opção **Todas as superfícies** substitui os vínculos de todos os materiais: use apenas se desejado.
4. Pinte com o botão esquerdo, orbite com o direito e aproxime com a roda. **B** pincel, **E** restaurar textura original, **V** navegação, **D** imagem; **Ctrl+Z** desfaz. Importe PNG/JPG para substituir a textura ou adicione uma imagem para posicionar uma arte no 3D. **Mapa UV** mostra a textura plana.
5. **Exportar YTD editado** baixa uma cópia do dicionário. **Exportar textura** baixa PNG. **Salvar projeto** preserva modelos, texturas e vínculos em `.paintfive`, reaberto em **Importar modelo**. Não há salvamento automático.

Os arquivos originais não são sobrescritos. Para pintura externa no YTD, os YFT originais continuam em uso no FiveM; não é necessário exportar geometria.

## Compatibilidade e limites

- YFT RSC7 versão 162 (Legacy): drawable principal e array de drawables, malhas indexadas e seleção de LODs presentes. `DiffuseSampler2` identifica a pintura; usa UV1 quando disponível, senão UV0.
- YTD RSC7 versão 13: seleção de texturas, DXT1/3/5 e BGRA/RGBA com recompressão e regeneração de mipmaps. Outros formatos legíveis podem exigir exportação PNG.
- YDD versão 165 e GLB/GLTF com recursos incorporados também são aceitos pela base.
- Visualização estática simplificada: não reproduz todos os shaders, transparência de vidros, animação, deformação, física ou peças de dano destacadas. Não aplica transformações esqueléticas adicionais; outros veículos podem exigir suporte específico. Texturas compartilhadas ausentes no YTD aparecem com material neutro.
- Enhanced/Gen9, BC7, RPF e arquivos criptografados/protegidos não são suportados.
- Até 80 MB por arquivo, 256 MB por recurso descomprimido, 8192 pixels por lado e 16 megapixels por textura. Cache de texturas limitado a 32 megapixels; entradas não editadas e não exibidas podem ser descartadas do cache. Muitas edições grandes simultâneas exigem exportar e reabrir o YTD.
- A compressão DXT tem perda. Confira a exportação no jogo antes de substituir arquivos de distribuição.

Os arquivos da Hilux fornecidos pelo usuário são amostras locais de validação e não integram o repositório ou o pacote distribuído.

## Desenvolvimento

Node.js 22+ e npm. Use o checkout existente; cada tarefa na nuvem já é isolada, sem necessidade de criar worktree.

```sh
npm ci --cache /tmp/godoy-npm
npm run dev -- --port 5173
npm test
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

Sem banco de dados, credenciais ou serviços externos obrigatórios. As fontes externas são opcionais.

Para validar arquivos reais, forneça a pasta com seus YFT/YDD/YTD:

```sh
npm run test:assets -- /pasta/com/arquivos
# Integração no navegador com um YFT e YTD reais; requer build:
CHROMIUM_PATH=/usr/bin/chromium node tests/vehicle.e2e.mjs /pasta/viatura.yft /pasta/viatura.ytd
```

Os testes de navegador iniciam e encerram um preview local. Para gerar um pacote Windows, execute `npm run package:windows`. A configuração usa Electron e verifica o checksum do download oficial. Um pacote gerado em Linux exige validação adicional no Windows. Não há publicação automática durante o desenvolvimento; o workflow de release roda ao enviar uma tag `v*`.

A implementação e os codecs JavaScript vêm da base PAINTFIVE do mesmo proprietário. Os offsets de YFT foram consultados nas definições públicas de [CodeWalker](https://github.com/dexyfex/CodeWalker/blob/master/CodeWalker.Core/GameFiles/Resources/Frag.cs). Avisos de terceiros estão em `THIRD_PARTY_NOTICES.txt`.

## Validação desta implementação

- 10 testes unitários de formatos e codecs.
- Build de produção e testes funcionais de navegador da base PAINTFIVE.
- Hilux fornecida: leitura de `vrhiluxsp.yft` e `vrhiluxsp_hi.yft`, cada um com 112 malhas, 339.019 vértices e 346.707 triângulos; decodificação das 73 texturas do YTD e preservação dos bytes descomprimidos ao exportar sem edições.
- Teste de navegador com `vrhiluxsp.yft` e seu YTD: pintura no 3D, exportação/releitura com somente a textura editada alterada, preservação das outras 72 texturas, salvamento/reabertura do projeto YFT e troca de variação da pintura.
- Testes funcionais executados em Chromium/Linux. A execução no jogo e do portable em Windows requer validação nessas plataformas.
