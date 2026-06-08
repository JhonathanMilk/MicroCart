import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Autenticacao({ setUser, setToken }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // Serve para redirecionar o usuário de página via código

  const handleLogin = (e) => {
    e.preventDefault();
    fetch('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(res => {
        if (!res.ok) throw new Error('Credenciais inválidas');
        return res.json();
      })
      .then(data => {
      // Em vez de chamar setUser e setToken soltos, use a função unificada do App.jsx
      setUser(data.user, data.token); 
      
      alert(`Bem-vindo, ${data.user.name}!`);
      navigate('/'); 
    })
      .catch(err => alert(err.message));
  };

  const handleRegister = (e) => {
    e.preventDefault();
    fetch('http://localhost:8080/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao cadastrar');
        return res.json();
      })
      .then(() => {
        alert('Cadastro realizado! Agora faça o seu login.');
        setIsRegistering(false);
      })
      .catch(err => alert(err.message));
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '20px' }}>
        {isRegistering ? 'Criar Nova Conta' : 'Identifique-se'}
      </h2>
      
      <form onSubmit={isRegistering ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {isRegistering && (
          <input type="text" placeholder="Seu Nome completo" value={name} onChange={e => setName(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        )}
        <input type="email" placeholder="Seu E-mail" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        <input type="password" placeholder="Sua Senha" value={password} onChange={e => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
        
        <button type="submit" style={{ padding: '12px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}>
          {isRegistering ? 'Cadastrar Conta' : 'Entrar no Sistema'}
        </button>
      </form>
      
      <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{ width: '100%', background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', textDecoration: 'underline', marginTop: '15px' }}>
        {isRegistering ? 'Já tem conta? Faça Login' : 'Não tem conta? Cadastre-se aqui'}
      </button>
    </div>
  );
}