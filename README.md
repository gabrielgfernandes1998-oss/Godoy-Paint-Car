# Godoy Paint Car

Editor local de pinturas de viaturas GTA V Legacy/FiveM. Tema vermelho e preto, com “Developed By Gabriel Godoy” abaixo do logo. Baseado no [PAINTFIVE](https://github.com/gabrielgfernandes1998-oss/PAINTFIVE), revisão `5bc7e528fd6fcb1d56cc986125c241405fe884af`.

## Windows portable

Baixe o ZIP em [Releases](https://github.com/gabrielgfernandes1998-oss/Godoy-Paint-Car/releases), extraia **todos os arquivos** e abra `GodoyPaintCar.exe`. Não precisa instalar Node.js. Requer Windows 10/11 x64 e WebGL. O pacote é gerado em Linux; a execução do EXE exige validação adicional em Windows.

## Abrir uma viatura

1. Em **Importar modelo**, abra o `.yft` ou `_hi.yft`.
2. Abra o `.ytd` correspondente em **Abrir dicionário YTD**. A pintura referenciada pelo modelo é selecionada automaticamente.
3. Escolha uma textura em **Texturas do dicionário**. Variações como `virgilio_sign_1` e `virgilio_sign_2` são associadas à carroceria. Para nomes diferentes, selecione o material em **Aplicar na viatura** e use **Vincular textura selecionada**. **Todas as superfícies** altera o vínculo de todos os materiais.
4. Trabalhe no **Editor 3D** ou no **Mapa UV**. Botão direito orbita e roda aproxima. A barra de ferramentas pode ser rolada em janelas menores.

## Camadas e objetos editáveis

Cada textura possui seu próprio documento e histórico:

- **+ Pintura** cria uma camada transparente de pixels. Pincel **B** e borracha **E** atuam na camada de pintura ativa. Se um objeto ou a base estiver selecionado, o pincel cria uma camada de pixels. A borracha remove pixels da camada, revelando as camadas abaixo.
- Selecione a camada na lista para mudar nome, visibilidade, ordem, opacidade, brilho, contraste e mesclagem **Normal / Multiply / Overlay / Screen**. Também é possível duplicar ou excluir. A base original é protegida contra exclusão e pintura direta.
- **Texto (T)** e **Imagem (D)**: clique/arraste para posicionar a prévia e use **Aplicar**. Depois de aplicar, selecione a camada novamente para editar. O texto preserva conteúdo, fonte, tamanho, negrito, cor, opacidade, contorno e sombra.
- **Selecionar / mover (A)**: arraste um texto, imagem ou forma no 3D ou UV para movê-lo. Também há campos de X/Y, largura, altura e rotação. Setas movem 1 pixel; Shift+seta move 10 pixels. O tamanho do texto é controlado pela fonte.
- **Ctrl+Z / Ctrl+Shift+Z** desfaz/refaz alterações de camadas e desenho. Escape cancela a criação ou o arraste atual.

### Fontes locais, contorno e sombra

Na ferramenta de texto, **Carregar fonte .ttf / .otf** importa uma fonte do computador, sem serviço externo. A fonte fica incorporada ao projeto `.paintfive` para reabrir o texto com a mesma aparência. Há controles de contorno (espessura/cor) e sombra (cor, suavidade e deslocamentos X/Y).

### Formas e caneta Bézier

- **Linha (L)**, **Retângulo (R)** e **Elipse (C)**: arraste entre os pontos para criar uma forma. Ajuste preenchimento, contorno, cor, dimensões e rotação depois. Para um círculo ou quadrado exato, defina largura e altura iguais.
- **Caneta Bézier (P)**: clique para adicionar nós; arraste ao criar um nó para definir suas alças. **Enter / Concluir curva** termina uma curva aberta; **Fechar forma Bézier** fecha o caminho e permite preenchimento.
- Para ajustar uma curva existente, selecione sua camada e clique em **Editar pontos da curva no UV**. Arraste nós ou alças visíveis no mapa.

### Preenchimento e seleção UV

- **Preenchimento (F)** oferece **Área contígua da textura**, com tolerância de cor/alpha, e **Material clicado**, que preenche as regiões UV daquele material.
- **Selecionar ilha UV (U)** escolhe a região conectada ao triângulo clicado. Pincel, preenchimento e novos objetos ficam restritos à máscara. A área é destacada no mapa UV.
- **Limpar seleção / máscara** libera os próximos desenhos. Objetos criados com máscara mantêm essa restrição; **Remover máscara da camada** libera o objeto selecionado.
- **Conta-gotas (I)** copia a cor original do pixel da textura selecionada, sem iluminação do 3D.

Superfícies que compartilham os mesmos pixels UV recebem a mesma pintura. Uma máscara não separa superfícies com UV sobreposto. Costuras e ilhas UV podem separar ou distorcer texto, linhas e imagens no 3D; use o mapa para posicionar a arte com precisão.

## Câmeras e iluminação

Os botões acima do viewport alternam para vistas **ortográficas** de Frente, Trás, Esquerda, Direita e Teto. **Centralizar / Perspectiva livre** volta à câmera de perspectiva. A iluminação pode ser **Estúdio**, **Dia** ou **Noite**, inclusive pelo seletor rápido no viewport. São cenários de prévia estática; a conferência final da pintura deve ser feita no jogo.

## Salvar e exportar

- **Salvar projeto** baixa `.paintfive` versão 3, com camadas, objetos, fontes locais, vínculos de materiais, seleção UV e visualização. Reabra em **Importar modelo**. Não há salvamento automático.
- Projetos das versões 1/2 continuam aceitos como camadas de pixels. Textos já achatados nessas versões não podem ser recuperados como objetos editáveis.
- **Exportar YTD editado** grava uma cópia composta, preservando as demais texturas e o layout do recurso. **Exportar textura** baixa PNG. Esses formatos contêm o resultado final em pixels; mantenha o `.paintfive` para continuar editando camadas.
- Os YFT originais continuam em uso no FiveM quando a pintura está em YTD separado. O editor não altera a geometria.
- O botão X fecha diretamente um projeto sem alterações. Com alterações ou prévias pendentes, oferece **Continuar editando** / **Sair sem salvar**.

## Compatibilidade e recursos

- YFT RSC7 versão 162: drawable principal e array de drawables, malhas indexadas e seleção dos LODs presentes. `DiffuseSampler2` identifica a pintura; UV1 é usado quando disponível, senão UV0.
- YTD versão 13: DXT1/3/5 e BGRA/RGBA com recompressão e regeneração de mipmaps. Outros formatos legíveis podem exigir exportação PNG.
- YDD versão 165 e GLB/GLTF com recursos incorporados e UV também são aceitos.
- Visualização estática simplificada: shaders GTA completos, transparência de vidros, animação, deformação, física e peças de dano destacadas não são reproduzidos. Transformações esqueléticas adicionais não são aplicadas. Outros modelos podem exigir suporte específico. Texturas compartilhadas ausentes aparecem com material neutro.
- Enhanced/Gen9, BC7, RPF e recursos protegidos/criptografados não são suportados.
- Até 80 MB por arquivo/projeto, 256 MB por recurso descomprimido, 8192 pixels por lado e 16 megapixels por textura ou imagem de camada. Cache de texturas de 32 megapixels; até 48 camadas por textura, 32 megapixels em camadas de pintura e 64 megapixels em bitmaps/máscaras de um documento. Histórico de até 12 ações, também limitado pela memória. Até 16 fontes locais de 10 MB cada. Projetos grandes podem exigir trabalhar em texturas separadas.
- DXT é uma compressão com perda. Confira o resultado no jogo antes de substituir os arquivos de distribuição.

## Desenvolvimento e validação

Node.js 22+ e npm. Use o checkout existente: cada tarefa na nuvem já é isolada, sem necessidade de worktree.

```sh
npm ci --cache /tmp/godoy-npm
npm run dev -- --port 5173
npm test
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
# Fechamento em Electron Linux, com um executável oficial já instalado:
ELECTRON_PATH=/caminho/electron npm run test:electron
# Arquivos reais, externos ao repositório:
npm run test:assets -- /pasta/com/yft-ytd
CHROMIUM_PATH=/usr/bin/chromium node tests/vehicle.e2e.mjs /pasta/viatura.yft /pasta/viatura.ytd
# Portable Windows:
NODE_USE_ENV_PROXY=1 npm run package:windows
```

A suíte avançada usa uma fonte TTF/OTF local para provar incorporação e restauração. Ela procura DejaVu/Liberation no Linux; use `TEST_FONT_PATH=/caminho/fonte.ttf` para outra fonte. Não distribui as fontes usadas no teste. Não há banco de dados, credenciais ou serviços externos obrigatórios; fontes externas da interface são opcionais.

Validações: formatos/codecs, conectividade de ilhas UV e limites de costuras; importação, pintura e exportação YTD; composição de mesclagens, ajustes por camada, preenchimento contíguo/material, máscara UV, movimento e reedição de texto, contorno/sombra, fontes locais, imagens, elipses e curvas Bézier; restauração do projeto, câmeras e iluminação. O fechamento foi testado em Electron real/Linux com as escolhas do diálogo simuladas. O EXE exige validação adicional em Windows.

Os arquivos da Hilux fornecidos pelo usuário são usados somente na validação local, fora do repositório e do portable. O parser/codecs vêm da base PAINTFIVE; offsets de YFT foram consultados nas definições públicas de [CodeWalker](https://github.com/dexyfex/CodeWalker/blob/master/CodeWalker.Core/GameFiles/Resources/Frag.cs). Avisos estão em `THIRD_PARTY_NOTICES.txt`.
