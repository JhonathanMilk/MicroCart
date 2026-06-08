import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Vitrine({ addToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA SISTEMA DE PAGINAÇÃO
  const [paginaAtual, setPaginaAtual] = useState(1);
  const produtosPorPagina = 8; // Garante 2 fileiras perfeitas de 4 produtos por página

  useEffect(() => {
    fetch('http://localhost:8080/api/v1/products')
      .then(response => response.json())
      .then(data => {
        console.log("📦 Produtos vindos do MongoDB:", data);
        setProducts(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar produtos no Gateway:", error);
        setLoading(false);
      });
  }, []);

  const handleImageError = (e) => {
    e.target.onerror = null; 
    e.target.src = 'https://www.autodeler.no/images/products/no_image_available.webp';
  };

  if (loading) return <h2 style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Carregando vitrine real...</h2>;

  // LÓGICA DA PAGINAÇÃO
  const indiceUltimoProduto = paginaAtual * produtosPorPagina;
  const indicePrimeiroProduto = indiceUltimoProduto - produtosPorPagina;
  
  // Fatiamos os produtos vindos do backend para exibir só os 8 da página atual
  const produtosPaginados = products.slice(indicePrimeiroProduto, indiceUltimoProduto);
  const totalPaginas = Math.ceil(products.length / produtosPorPagina);

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '1100px', margin: '0 auto', padding: '0 10px' }}>
      
      <h3 style={{ color: '#333', marginBottom: '25px', textAlign: 'center', fontSize: '1.5em' }}>
        Produtos Disponíveis
      </h3>
      
      {/* Força 4 colunas perfeitamente distribuídas sem deixar vácuo nas bordas */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '24px' 
      }}>
        {produtosPaginados.map(product => {
          const isEsgotado = product.stock <= 0;
          const pId = product._id || product.id;

          const imagemFinal = product.image && product.image.trim() !== "" 
            ? product.image 
            : 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=300&auto=format&fit=crop&q=60';

          return (
            <div key={pId} style={{ backgroundColor: '#fff', border: '1px solid #ddd', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: '0.2s' }}>
              
              <div>
                <Link to={`/produto/${pId}`} style={{ textDecoration: 'none' }}>
                  <div style={{ width: '100%', height: '150px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', backgroundColor: '#f8f9fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={imagemFinal} 
                      alt=""
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: isEsgotado ? 'grayscale(100%)' : 'none' }}
                      onError={handleImageError}
                    />
                  </div>
                </Link>

                <Link 
                  to={`/produto/${pId}`} 
                  style={{ textDecoration: 'none' }}
                >
                  <h3 
                    style={{ margin: '0 0 10px 0', color: '#222', fontSize: '1em', minHeight: '44px', lineHeight: '1.3', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                    onMouseEnter={(e) => e.target.style.color = '#006cc5'}
                    onMouseLeave={(e) => e.target.style.color = '#222'}
                  >
                    {product.name}
                  </h3>
                </Link>
              </div>

              <div>
                <p style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.2em', margin: '10px 0' }}>R$ {product.price.toFixed(2)}</p>
                <p style={{ color: '#7f8c8d', fontSize: '0.9em', marginBottom: '10px' }}>Estoque: {product.stock} un</p>
                
                <Link 
                  to={`/produto/${pId}`} 
                  style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', fontSize: '0.75em', color: '#006cc5', textDecoration: 'none', fontWeight: 'bold', marginBottom: '10px', padding: '6px', borderRadius: '4px', backgroundColor: '#f4f9fd' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e1f0fc'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f4f9fd'}
                >
                  🔍 Ver Detalhes
                </Link>

                <button 
                  onClick={() => addToCart(product)}
                  disabled={isEsgotado}
                  style={{ width: '100%', padding: '10px', backgroundColor: isEsgotado ? '#bdc3c7' : '#3498db', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isEsgotado ? 'not-allowed' : 'pointer', transition: '0.2s' }}
                  onMouseEnter={(e) => !isEsgotado && (e.target.style.backgroundColor = '#2980b9')}
                  onMouseLeave={(e) => !isEsgotado && (e.target.style.backgroundColor = '#3498db')}
                >
                  {isEsgotado ? 'Indisponível' : '🛒 Comprar'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* INTERFACE VISUAL DA PAGINAÇÃO: Exibida apenas se houver mais de uma página */}
      {totalPaginas > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '40px', paddingBottom: '30px' }}>
          <button 
            onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))} 
            disabled={paginaAtual === 1}
            style={{ padding: '10px 18px', backgroundColor: paginaAtual === 1 ? '#e0e0e0' : '#006cc5', color: paginaAtual === 1 ? '#a0a0a0' : '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', transition: '0.2s' }}
          >
            ◀ Anterior
          </button>

          <span style={{ fontWeight: '600', color: '#444', fontSize: '0.95em' }}>
            Página {paginaAtual} de {totalPaginas}
          </span>

          <button 
            onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))} 
            disabled={paginaAtual === totalPaginas}
            style={{ padding: '10px 18px', backgroundColor: paginaAtual === totalPaginas ? '#e0e0e0' : '#006cc5', color: paginaAtual === totalPaginas ? '#a0a0a0' : '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: paginaAtual === totalPaginas ? 'not-allowed' : 'pointer', transition: '0.2s' }}
          >
            Próxima ▶
          </button>
        </div>
      )}

    </div>
  );
}