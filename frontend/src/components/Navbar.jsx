import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';



export default function Navbar({ user, handleLogout }) {
  // Estado para controlar a abertura do menu suspenso (popup)
  const [menuAberto, setMenuAberto] = useState(false);
  const dropdownRef = useRef(null);

  // Fecha o menu suspenso automaticamente se o usuário clicar em qualquer outro lugar da tela
  useEffect(() => {
    function tratarCliqueFora(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", tratarCliqueFora);
    return () => document.removeEventListener("mousedown", tratarCliqueFora);
  }, []);

  return (
    <nav style={{ backgroundColor: '#006cc5', padding: '18px 40px', borderRadius: '1px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '30px', fontFamily: 'sans-serif', position: 'relative' }}>
      <div>
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          {/* MicroCart Logo */}
          <img 
            src="https://iili.io/CF1V2wB.png" 
            alt="MicroCart Logo" 
            style={{ 
              height: '80px',       
              width: 'auto',        
              objectFit: 'contain', 
              display: 'block' 
            }} 
          />
        </Link>
      </div>
      
      <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
        <Link to="/" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: '600', fontSize: '0.95em', transition: '0.2s' }}>Produtos</Link>
        <Link to="/carrinho" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: '600', fontSize: '0.95em', transition: '0.2s' }}>🛒 Carrinho</Link>

        {/* CONDICIONAL DO ADMIN */}
        {user && user.role === 'admin' && (
          <Link to="/admin" style={{ color: '#ff7300', textDecoration: 'none', fontWeight: 'bold', border: '1px solid #ff7300', padding: '6px 12px', borderRadius: '8px', fontSize: '0.95em', transition: '0.2s' }}>👑 Painel Admin</Link>
        )}
        
        <div style={{ marginLeft: '15px', borderLeft: '2px solid #eee', paddingLeft: '25px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              
              {/* CONTAINER DO POPUP DE PERFIL */}
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                <button 
                  onClick={() => setMenuAberto(!menuAberto)}
                  style={{ background: 'none', border: 'none', color: '#82d4e2', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '5px 8px', borderRadius: '8px', fontSize: '1em', transition: '0.2s' }}
                >
                  <div style={{ width: '32px', height: '32px', backgroundColor: '#eef2f7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9em', fontWeight: 'bold', color: '#3498db' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name.split(' ')[0]}</span>
                  <span style={{ fontSize: '0.7em', transform: menuAberto ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}>▼</span>
                </button>

                {/* POPUP / DROPDOWN MENU */}
                {menuAberto && (
                  <div style={{ position: 'absolute', top: '45px', right: 0, backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #eee', minWidth: '170px', padding: '8px 0', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                    
                    <Link 
                      to="/perfil" 
                      onClick={() => setMenuAberto(false)}
                      style={{ padding: '10px 16px', color: '#333', textDecoration: 'none', fontSize: '0.95em', fontWeight: '600', textAlign: 'left', transition: '0.2s' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      👤 Meu Perfil
                    </Link>

                    <Link 
                      to="/historico" 
                      onClick={() => setMenuAberto(false)}
                      style={{ padding: '10px 16px', color: '#333', textDecoration: 'none', fontSize: '0.95em', fontWeight: '600', textAlign: 'left', transition: '0.2s', borderBottom: '1px solid #f4f4f9' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      🛍️ Minhas Compras
                    </Link>

                    <button 
                      onClick={() => { setMenuAberto(false); handleLogout(); }}
                      style={{ padding: '10px 16px', color: '#e74c3c', backgroundColor: 'transparent', border: 'none', fontSize: '0.95em', fontWeight: 'bold', textAlign: 'left', cursor: 'pointer', width: '100%', transition: '0.2s' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#fff5f5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      🚪 Sair
                    </button>

                  </div>
                )}
              </div>

            </div>
          ) : (
            <Link to="/login" style={{ padding: '10px 20px', backgroundColor: '#3498db', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9em', boxShadow: '0 4px 10px rgba(52,152,219,0.2)' }}>Entrar / Cadastrar</Link>
          )}
        </div>
      </div>
    </nav>
  );
}