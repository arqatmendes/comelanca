# Comelança

Cardápio semanal das crianças: sugere refeições sem repetir, controla o que cada filho gosta, alergias, cardápio da escola e busca receitas novas.

- `www/` — o app (HTML/CSS/JS, sem dependências). No iPhone: abrir o link do GitHub Pages no Safari → Compartilhar → "Adicionar à Tela de Início".
- `android/` — empacotamento do APK (WebView). `android/build.sh` gera `Comelanca.apk`.
- `devserver.js` — `node devserver.js` serve o app em http://localhost:8080 para testes.

A chave de assinatura do APK (`comelanca.keystore`) **não** fica no repositório — guarde a cópia que veio no .zip.
