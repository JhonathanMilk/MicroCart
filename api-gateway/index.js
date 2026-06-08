const express = require('express');
const proxy = require('express-http-proxy');
const cors = require('cors');
const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[Gateway] Requisição recebida para: ${req.url}`);
  next();
});

// ================= ROTAS DO PRODUCT-SERVICE (3001) =================

// Inserção de produtos (Compatibilidade/Legado)
app.use('/api/v1/products/add', proxy('http://localhost:3001', {
  proxyReqPathResolver: (req) => '/products'
}));

// SISTEMA DE RECOMENDAÇÃO
app.use('/api/v1/products/:id/recommendations', proxy('http://localhost:3001', {
  proxyReqPathResolver: (req) => {
    // req.url aqui chega apenas como "/recommendations" ou contendo barras extras.
    // O Express monta o proxy baseado na rota base, então extraímos o ID direto do caminho original (req.originalUrl)
    const partes = req.originalUrl.split('/'); 
    const id = partes[4]; // Captura a quarta posição da barra: ["", "api", "v1", "products", "ID_AQUI", "recommendations"]
    
    console.log(`🤖 Gateway redirecionando recomendação para o ID: ${id}`);
    return `/products/${id}/recommendations`;
  }
}));

// Rota Padrão de Produtos (Vitrine e Detalhes)
app.use('/api/v1/products', proxy('http://localhost:3001', {
  proxyReqPathResolver: (req) => {
    return req.url === '/' ? '/products' : `/products${req.url}`;
  }
}));

// Rota de Gerenciamento do Carrinho
app.use('/api/v1/cart', proxy('http://localhost:3001', {
  proxyReqPathResolver: (req) => {
    return req.url === '/' ? '/cart' : `/cart${req.url}`;
  }
}));

// ================= ROTAS DO AUTH-SERVICE (3002) =================

// Rota de Admin (Com repasse manual do token JWT)
app.use('/api/v1/auth/admin', proxy('http://localhost:3002', {
  proxyReqPathResolver: (req) => `/admin${req.url}`,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.headers['authorization']) {
      proxyReqOpts.headers['authorization'] = srcReq.headers['authorization'];
    }
    return proxyReqOpts;
  }
}));

// Rota de Endereços
app.use('/api/v1/auth/addresses', proxy('http://localhost:3002', {
  proxyReqPathResolver: (req) => {
    return req.url === '/' ? '/addresses' : `/addresses${req.url}`;
  }
}));

// Rota de Atualizar Perfil
app.use('/api/v1/auth/update-profile', proxy('http://localhost:3002', {
  proxyReqPathResolver: (req) => '/update-profile'
}));

// Rota Base de Autenticação (Login/Register) - Por último por ser genérica
app.use('/api/v1/auth', proxy('http://localhost:3002', {
  proxyReqPathResolver: (req) => req.url
}));

// ================= ROTAS DO ORDER-SERVICE (3003) =================
app.use('/api/v1/orders', proxy('http://localhost:3003', {
  proxyReqPathResolver: (req) => {
    return req.url === '/' ? '/orders' : `/orders${req.url}`;
  }
}));

app.listen(PORT, () => {
  console.log('🛡️ API Gateway rodando na porta 8080');
});