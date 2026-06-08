import { useState, useEffect } from 'react'; 
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Importando nossos componentes e páginas
import Navbar from './components/Navbar';
import Vitrine from './pages/Vitrine';
import Carrinho from './pages/Carrinho';
import Autenticacao from './pages/Autenticacao';
import Perfil from './pages/Perfil';
import Admin from './pages/Admin';
import Historico from './pages/Historico';
import ProdutoDetalhes from './pages/ProdutoDetalhes';

function App() {

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('shop_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, setToken] = useState(() => {
    return localStorage.getItem('shop_token') || '';
  });
  
  const [cart, setCart] = useState([]);

  // ESTADOS PARA POPUP DE SUCESSO DO CARRINHO
  const [popupVisivel, setPopupVisivel] = useState(false);
  const [ultimoProdutoAdicionado, setUltimoProdutoAdicionado] = useState('');

  // Sempre que o usuário logar (ou der F5 e o estado inicial carregar), busca o carrinho dele automaticamente
  useEffect(() => {
    if (user) {
      fetchUserCart(user.email);
    }
  }, [user]);

  // Função para buscar o carrinho do banco de dados (MongoDB)
  const fetchUserCart = (email) => {
    fetch(`http://localhost:8080/api/v1/cart/${email}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.items) {
          setCart(data.items); 
        }
      })
      .catch(err => console.error("Erro ao buscar carrinho do banco:", err));
  };

  // Função para salvar o carrinho atual no banco de dados com Segurança JWT
  const saveCartToDatabase = (email, currentCart) => {
    fetch('http://localhost:8080/api/v1/cart', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        userEmail: email,
        items: currentCart
      })
    })
    .catch(err => console.error("Erro ao persistir carrinho:", err));
  };

  const handleUserLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('shop_user', JSON.stringify(userData));
    localStorage.setItem('shop_token', userToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    setCart([]);
    localStorage.removeItem('shop_user');
    localStorage.removeItem('shop_token');
  };

  // Função global para alimentar o carrinho e salvar no Mongo
  const addToCart = (product) => {
    if (!user) {
      alert("Você precisa fazer login para colocar itens no carrinho!");
      return;
    }
    
    const pId = product.id || product._id;
    const existingItem = cart.find(item => (item.id === pId || item.productId === pId || item._id === pId));
    
    let updatedCart;
    if (existingItem) {
      updatedCart = cart.map(item => 
        (item.id === pId || item.productId === pId || item._id === pId) 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      );
    } else {
      updatedCart = [...cart, { 
        productId: pId, 
        name: product.name, 
        price: product.price, 
        quantity: 1 
      }];
    }
    
    setCart(updatedCart);
    saveCartToDatabase(user.email, updatedCart);

    // ACIONA O POPUP CUSTOMIZADO
    setUltimoProdutoAdicionado(product.name);
    setPopupVisivel(true);
  };

  // Efeito para fechar o popup de sucesso automaticamente após 4 segundos
  useEffect(() => {
    if (popupVisivel) {
      const timer = setTimeout(() => {
        setPopupVisivel(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [popupVisivel]);

  const updateCart = (updatedCart) => {
    setCart(updatedCart);
    if (user) {
      saveCartToDatabase(user.email, updatedCart);
    }
  };

  const clearCartAfterCheckout = () => {
    setCart([]);
    saveCartToDatabase(user.email, []); 
  };

  return (
    <Router>
      <div style={{ padding: '20px', backgroundColor: '#f4f4f9', minHeight: '100vh', boxSizing: 'border-box', position: 'relative' }}>
        
        <Navbar user={user} handleLogout={handleLogout} />

        {popupVisivel && (
          <div style={{
            position: 'fixed',
            top: '30px',
            right: '30px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            borderLeft: '5px solid #006cc5', // Mesmo azul da sua navbar
            padding: '16px 20px',
            zIndex: 9999,
            minWidth: '300px',
            fontFamily: 'sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'slideIn 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: '#2c3e50', fontSize: '1em' }}>🛒 Adicionado!</span>
              <button 
                onClick={() => setPopupVisivel(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2em', color: '#95a5a6', cursor: 'pointer', padding: '0 5px' }}
              >
                ×
              </button>
            </div>
            
            <p style={{ margin: 0, color: '#555', fontSize: '0.9em' }}>
              O produto <strong>{ultimoProdutoAdicionado}</strong> foi adicionado à sacola.
            </p>

            <Link 
              to="/carrinho" 
              onClick={() => setPopupVisivel(false)}
              style={{
                alignSelf: 'flex-end',
                backgroundColor: '#006cc5',
                color: '#fff',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.85em',
                fontWeight: 'bold',
                textAlign: 'center',
                transition: '0.2s',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#00569d'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#006cc5'}
            >
              Ir para o Carrinho →
            </Link>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Vitrine addToCart={addToCart} />} />
          <Route path="/produto/:id" element={<ProdutoDetalhes addToCart={addToCart} user={user} />} />
          
          <Route path="/carrinho" element={
            <Carrinho 
              user={user} 
              cart={cart} 
              setCart={updateCart} 
              clearCart={clearCartAfterCheckout} 
            />
          } />
          <Route path="/login" element={<Autenticacao setUser={handleUserLogin} setToken={setToken} />} />
          <Route path="/perfil" element={<Perfil user={user} setUser={setUser} />} /> 
          <Route path="/admin" element={<Admin user={user} />} />
          <Route path="/historico" element={<Historico user={user} />} />
        </Routes>

      </div>
    </Router>
  );
}

export default App;