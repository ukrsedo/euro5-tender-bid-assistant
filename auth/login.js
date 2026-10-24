export function loginHtml(error=''){
  return `<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Вхід · ЄВРО5</title>
<style>body{font:17px system-ui;background:#f3f6fa;color:#172b4d;margin:0;padding:5vh 20px}main{max-width:460px;margin:auto;padding:30px;background:white;border-radius:16px}label,input,button{display:block;box-sizing:border-box;width:100%;margin:14px 0}input,button{padding:13px;font:inherit}button{background:#164f91;color:white;border:0;border-radius:8px;cursor:pointer}a{color:#164f91}.error{color:#9b2525}</style>
<main><h1>ЄВРО5</h1><h2>Тестовий доступ</h2><p>Спільний профіль тендерного відділу. Аналізи зберігаються від імені «Тестувальник ЄВРО5».</p>
${error?'<p class="error" role="alert">'+error+'</p>':''}<form action="/auth/test" method="post"><label for="password">Пароль тестової групи</label><input id="password" name="password" type="password" autocomplete="current-password" required minlength="12" maxlength="256"><button type="submit">Увійти</button></form>
<p><a href="/admin-login">Індивідуальний вхід за кодом на email</a></p><p>Після входу пам’ять підключається автоматично.</p></main></html>`;
}
