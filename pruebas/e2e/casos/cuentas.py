"""Inicio de sesión, registro, recuperar contraseña y perfil."""
import re

from base import ANONIMO, CLIENTE, prueba, sin_fallas

ERRORES = {
    'es': {
        'auth/invalid-email': 'El correo no es válido.', 'auth/user-not-found': 'No existe una cuenta con ese correo.',
        'auth/wrong-password': 'Contraseña incorrecta.', 'auth/invalid-credential': 'Correo o contraseña incorrectos.',
        'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.', 'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
        'auth/network-request-failed': 'Ocurrió un error. Intenta de nuevo.',
    },
    'en': {
        'auth/invalid-email': 'Invalid email address.', 'auth/user-not-found': 'No account exists with that email.',
        'auth/wrong-password': 'Incorrect password.', 'auth/invalid-credential': 'Incorrect email or password.',
        'auth/email-already-in-use': 'An account with that email already exists.', 'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/network-request-failed': 'An error occurred. Please try again.',
    },
}


def enviar(s, email='ana@ejemplo.com', clave='abc123'):
    s.pg.locator('input[name=email]').fill(email)
    s.pg.locator('input[name=password]').fill(clave)
    s.tocar(s.pg.locator('.login-form button[type=submit]'))


@prueba('el login tiene dos pestañas y ?modo=registro abre la de crear cuenta')
def pestanas(ctx):
    s = ctx.sesion()
    s.ir('/login', 500)
    assert [b.strip() for b in s.pg.locator('.login-tabs button').all_inner_texts()] == [ctx.tr('menu.iniciar_sesion'), ctx.tr('login.crear_cuenta')]
    assert s.txt('.login-tabs .activo') == ctx.tr('menu.iniciar_sesion')
    sin_fallas(s)
    s.ir('/login?modo=registro', 500)
    assert s.txt('.login-tabs .activo') == ctx.tr('login.crear_cuenta')
    s.tocar(s.pg.locator('.login-tabs button').nth(0))
    s.pg.wait_for_function("document.querySelector('.login-tabs .activo').innerText !== " + repr(ctx.tr('login.crear_cuenta')).replace("'", '"'))


@prueba('los errores de inicio de sesión salen en el idioma elegido', permitir_errores=())
def errores_de_login(ctx):
    s = ctx.sesion()
    s.ir('/login', 500)
    fallas = []
    for codigo, esperado in ERRORES[ctx.idioma].items():
        s.ev("(c) => { window.__authError = c; }", codigo)
        enviar(s)
        s.pg.wait_for_selector('.login-error')
        if s.txt('.login-error') != esperado:
            fallas.append(f'{codigo}: "{s.txt(".login-error")}" y se esperaba "{esperado}"')
    assert not fallas, '\n        '.join(fallas)
    assert s.url() == '/login'


@prueba('los errores al crear la cuenta salen en el idioma elegido')
def errores_de_registro(ctx):
    s = ctx.sesion()
    s.ir('/login?modo=registro', 500)
    fallas = []
    for codigo in ('auth/email-already-in-use', 'auth/weak-password', 'auth/invalid-email', 'auth/network-request-failed'):
        s.ev("(c) => { window.__authError = c; }", codigo)
        enviar(s)
        s.pg.wait_for_selector('.login-error')
        if s.txt('.login-error') != ERRORES[ctx.idioma][codigo]:
            fallas.append(f'{codigo}: "{s.txt(".login-error")}"')
    assert not fallas, '\n        '.join(fallas)


@prueba('iniciar sesión y crear cuenta llevan al inicio con la sesión abierta')
def entrar(ctx):
    s = ctx.sesion()
    s.ir('/login', 500)
    enviar(s)
    s.esperar_url(r'/$')
    assert '"ana@ejemplo.com"' in s.local('__user')
    s2 = ctx.sesion()
    s2.ir('/login?modo=registro', 500)
    enviar(s2, 'nueva@ejemplo.com')
    s2.esperar_url(r'/$')
    assert 'nueva@ejemplo.com' in s2.local('__user')


@prueba('Google: si se cancela avisa y si funciona entra', permitir_errores=())
def google(ctx):
    s = ctx.sesion()
    s.ir('/login', 500)
    s.ev("window.__authError = 'auth/popup-closed-by-user'")
    s.tocar(s.pg.locator('.login-google'))
    s.pg.wait_for_selector('.login-error')
    assert s.txt('.login-error') == ctx.t('No se pudo iniciar con Google.', 'Could not sign in with Google.'), s.txt('.login-error')
    s.ev("window.__authError = null")
    s.tocar(s.pg.locator('.login-google'))
    s.esperar_url(r'/$')
    assert 'ana.g@gmail.com' in s.local('__user')


@prueba('¿Olvidaste tu contraseña?: pide el correo y siempre contesta lo mismo, exista o no la cuenta')
def olvide(ctx):
    s = ctx.sesion()
    s.ir('/login', 500)
    s.tocar(s.pg.locator('.login-olvide'))
    s.pg.wait_for_selector('.login-error')
    assert s.txt('.login-error') == ctx.tr('login.olvide_escribe')
    s.pg.locator('input[name=email]').fill('ana@ejemplo.com')
    s.tocar(s.pg.locator('.login-olvide'))
    s.pg.wait_for_selector('.login-aviso')
    assert s.txt('.login-aviso') == ctx.tr('login.olvide_enviado')
    assert s.ev('window.__recuperacionEnviada') == 1
    s.ev("window.__authError = 'auth/user-not-found'")
    s.tocar(s.pg.locator('.login-olvide'))
    s.pg.wait_for_timeout(400)
    assert s.txt('.login-aviso') == ctx.tr('login.olvide_enviado'), 'una cuenta que no existe no debe notarse'
    assert s.n('.login-error') == 0


@prueba('quien ya inició sesión ve su cuenta en /login y una sesión de invitado ve el formulario', idioma=('es',))
def login_con_sesion(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    s.ir('/login', 700)
    assert 'ana@ejemplo.com' in s.main() and s.n('.login-form') == 0, s.main()[:140]
    inv = ctx.sesion(usuario=ANONIMO)
    inv.ir('/login', 700)
    assert inv.n('.login-form') == 1 and inv.n('.login-google') == 1


@prueba('perfil: guarda los datos, avisa si falla y cierra la sesión con confirmación')
def perfil(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    s.ir('/perfil', 900)
    assert 'ana@ejemplo.com' in s.main()
    sin_fallas(s)
    campos = s.pg.locator('.perfil-form input')
    campos.nth(0).fill('Ana Quispe Mamani')
    campos.nth(1).fill('987654321')
    campos.nth(2).fill('Cercado')
    campos.nth(3).fill('Calle Mercaderes 123')
    s.tocar(s.pg.locator('.perfil-btn-principal'))
    s.pg.wait_for_function(f"(document.querySelector('.perfil-mensaje') || {{innerText: ''}}).innerText.includes({ctx.tr('perfil.guardado')[2:]!r})")
    guardado = s.escrituras('usuarios')[-1]['datos']
    assert (guardado['nombre'], guardado['telefono'], guardado['distrito'], guardado['direccion']) == ('Ana Quispe Mamani', '987654321', 'Cercado', 'Calle Mercaderes 123'), guardado
    s.ev('window.__fallarEscrituras = true')
    s.tocar(s.pg.locator('.perfil-btn-principal'))
    s.pg.wait_for_function(f"(document.querySelector('.perfil-mensaje') || {{innerText: ''}}).innerText.includes({ctx.tr('perfil.error')[2:]!r})")
    s.ev('window.__fallarEscrituras = false')
    s.tocar(s.pg.locator('.perfil-acceso-btn.cerrar-sesion'))
    s.pg.wait_for_selector('[class*=modal]')
    assert ctx.tr('perfil.cerrar_sesion_titulo') in s.txt('[class*=modal]') and 'ana@ejemplo.com' in s.txt('[class*=modal]')
    assert s.desborde()[0] <= s.desborde()[1]
    s.pg.locator('[class*=modal] button').last.click()
    s.esperar_url(r'/$')
    assert s.local('__user') is None


@prueba('perfil: Mis pedidos lleva a la lista', idioma=('es',))
def perfil_pedidos(ctx):
    s = ctx.sesion(usuario=CLIENTE)
    s.ir('/perfil', 700)
    s.tocar(s.pg.locator('.perfil-acceso-btn').filter(has_text=re.compile(ctx.tr('perfil.mis_pedidos'))).first)
    s.esperar_url('/pedidos')
