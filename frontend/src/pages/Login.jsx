import React from 'react';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import useLogin from './login/useLogin';
import CuentaActiva from './login/CuentaActiva';
import FormularioLogin from './login/FormularioLogin';
import '../styles/Login.css';

export default function Login() {
  const login = useLogin();
  const { cuenta, bloqueado } = login;

  return (
    <>
      <Header />
      <main className="login-page">
        {cuenta && !bloqueado ? <CuentaActiva cuenta={cuenta} /> : <FormularioLogin login={login} />}
      </main>
      <Footer />
    </>
  );
}
