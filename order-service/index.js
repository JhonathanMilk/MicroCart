// order-service/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 3003; 

app.use(express.json());
app.use(cors());

// Conexão com um banco isolado para Pedidos
mongoose.connect('mongodb://localhost:27017/orders_db')
  .then(() => console.log("📦 Conectado ao MongoDB de PEDIDOS com sucesso!"))
  .catch(err => console.error("Erro ao conectar no Mongo de Pedidos:", err));

// --- SCHEMA E MODELO DE PEDIDO ---
const OrderSchema = new mongoose.Schema({
  userEmail: { type: String, required: true },
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  address: {
    cep: String,
    rua: String,
    cidade: String
  },
  status: { type: String, default: "Preparando para Envio" },
  trackingCode: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

// --- ROTAS DO ORDER-SERVICE ---

// Criar novo pedido (Orquestrando baixa de estoque em microsserviço)
app.post('/orders', async (req, res) => {
  try {
    const { userEmail, items, total, paymentMethod, address } = req.body;

    console.log(`🎬 Iniciando checkout para o usuário: ${userEmail}`);

    // Solicita a baixa de estoque de cada item diretamente ao product-service (Porta 3001)
    for (const item of items) {
      const idProduto = item.productId || item.id || item._id;
      
      console.log(`📉 Solicitando baixa de ${item.quantity} un. do produto ID: ${idProduto}`);
      
      const respostaEstoque = await fetch(`http://localhost:3001/products/${idProduto}/decrease-stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: item.quantity })
      });

      // Se o estoque falhar (ex: acabou enquanto ele pagava), interrompe o checkout antes de salvar o pedido
      if (!respostaEstoque.ok) {
        const erroDados = await respostaEstoque.json();
        console.error(`⚠️ Falha ao baixar estoque: ${erroDados.error}`);
        return res.status(400).json({ error: erroDados.error || "Estoque insuficiente para concluir a compra." });
      }
    }

    // Com o estoque garantido, gera o código de rastreio e cria o pedido
    const randomCode = "BR" + Math.floor(100000000 + Math.random() * 900000000) + "X";

    const novoPedido = new Order({
      userEmail, 
      items, 
      total, 
      paymentMethod, 
      address, 
      trackingCode: randomCode
    });

    await novoPedido.save();
    console.log(`✅ Novo pedido registrado e salvo: ${novoPedido._id}`);
    
    res.status(201).json(novoPedido);

  } catch (err) {
    console.error("❌ Erro crítico no processo de checkout:", err.message);
    res.status(500).json({ error: "Erro interno ao processar e registrar o pedido." });
  }
});

// Listar pedidos de um usuário específico
app.get('/orders/:email', async (req, res) => {
  try {
    const pedidos = await Order.find({ userEmail: req.params.email }).sort({ createdAt: -1 });
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar histórico." });
  }
});

app.listen(PORT, () => console.log(`Order Service rodando na porta ${PORT}`));