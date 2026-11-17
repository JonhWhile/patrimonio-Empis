# Matrimonio Empis – como colocar no ar (grátis)

São 3 arquivos: `index.html` (o site), `Code.gs` (conecta à planilha e envia e-mails) e este guia.

## Parte 1 – Planilha e Apps Script (5 minutos)
1. Crie uma planilha em sheets.google.com (nome: "Matrimonio Empis").
2. Menu **Extensões → Apps Script**.
3. Apague o código que aparece, cole todo o conteúdo de `Code.gs` e salve.
4. Selecione a função **configurar** no topo e clique em **Executar**. Autorize o acesso (Avançado → Acessar projeto). Isso cria as abas *Equipamentos* e *Empréstimos*.
5. Clique em **Implantar → Nova implantação → tipo "App da Web"**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Clique em Implantar e **copie a URL** (termina em `/exec`).

## Parte 2 – Conectar o site
Abra `index.html` no Bloco de Notas, troque `COLE_AQUI_A_URL_DO_APPS_SCRIPT` pela URL copiada e salve.

## Parte 3 – Hospedar de graça (escolha uma)
- **Netlify Drop** (mais fácil): acesse app.netlify.com/drop e arraste o `index.html`. O link já funciona.
- **GitHub Pages** ou **Cloudflare Pages**: envie o `index.html` para um repositório e ative o Pages.

## Como usar
1. Primeiro, aba **Registrar equipamento**: cadastre cada item com número único.
2. **Novo empréstimo**: informe os dados do professor, filtre e marque todos os equipamentos desejados (ou use **Selecionar todos disponíveis**), informe a data/hora de devolução e o técnico responsável. Ao confirmar, cada equipamento terá seu próprio registro na planilha e o professor receberá um único e-mail com a lista completa.
3. **Devolução**: digite o número (ou clique em *Devolvido* na lista) e o chamado é encerrado, com novo e-mail.

## Colunas da planilha (aba Empréstimos)
Responsável · Setor · Equipamento · Número · Quantidade · Retirada · Devolução prevista · Devolução · Autorizado por · E-mail · Telefone · Status

## Observações
- Os e-mails saem da conta Google dona da planilha (limite de ~100 por dia em conta Gmail comum; contas Google Workspace escolares têm limite maior).
- Para instalar a seleção múltipla, substitua o código no Apps Script pelo `Code.gs` atualizado. Depois faça **Implantar → Gerenciar implantações → editar → Nova versão** para ativar o backend atualizado; publique também o `index.html` atualizado na hospedagem do site.
- Quem tiver o link do site consegue usá-lo. Para restringir, não divulgue o link fora da equipe.
