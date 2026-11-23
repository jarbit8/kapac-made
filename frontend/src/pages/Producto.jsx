import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useIdioma } from '../context/LanguageContext';
import { useTextos } from '../context/TextosContext';
import Cargando from '../components/Cargando/Cargando';
import useProducto from './producto/useProducto';
import { cssEstilosProducto } from './producto/estilos';
import CarruselFotos from './producto/CarruselFotos';
import InfoProducto from './producto/InfoProducto';
import GaleriaPropia from './producto/GaleriaPropia';
import Relacionados from './producto/Relacionados';
import '../styles/Producto.css';

export default function Producto() {
  const { id } = useParams();
  const { idioma } = useIdioma();
  const { textos, esAdmin } = useTextos();
  const specsColor = textos['producto_specs_color'] || '';
  const edicion = useProducto(id);
  const { producto, relacionados, cargando, error } = edicion;
  const cssProducto = cssEstilosProducto(producto?.estilos);

  return (
    <>
      <Header />
      <main className="producto-page" style={specsColor ? { '--specs-color': specsColor } : undefined}>
        {cssProducto && <style>{cssProducto}</style>}
        {cargando && <Cargando />}
        {error && <p className="producto-msg">{error}</p>}

        {producto && (
          <div className="producto-detalle">
            <CarruselFotos key={id} producto={producto} esAdmin={esAdmin} onCambiarFotos={edicion.cambiarFotos} />
            <InfoProducto producto={producto} esAdmin={esAdmin} edicion={edicion} />
          </div>
        )}

        {producto && <GaleriaPropia producto={producto} esAdmin={esAdmin} idioma={idioma} onCambiar={edicion.cambiarGaleria} />}

        {producto && relacionados.length > 0 && <Relacionados relacionados={relacionados} idioma={idioma} />}
      </main>
      <Footer />
    </>
  );
}
