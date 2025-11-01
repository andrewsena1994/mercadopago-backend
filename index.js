require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// rota de saúde p/ healthcheck do Cloud Run
app.get('/', (_req, res) => res.send('ok'));
app.get('/health', (_req, res) => res.send('healthy'));

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
if (!ACCESS_TOKEN) console.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN não definido. Só local com .env. No Cloud Run, configure nas variáveis.');

app.post('/api/create-payment-preference', async (req, res) => {
  try {
    const { title = 'Créditos', quantity = 1, unit_price = 39.9, description = 'Compra de créditos' } = req.body || {};
    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      {
        items: [{ title, quantity, unit_price, currency_id: 'BRL', description }],
        back_urls: {
          success: 'https://seusite.com/sucesso',
          pending: 'https://seusite.com/pendente',
          failure: 'https://seusite.com/erro'
        },
        auto_return: 'approved'
        // notification_url: 'https://seu-backend.com/webhooks/mercadopago'
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const checkoutUrl = response.data.init_point || response.data.sandbox_init_point;
    res.json({ checkoutUrl });
  } catch (e) {
    console.error('Erro ao criar preferência:', e?.response?.data || e.message);
    res.status(500).json({ error: 'Falha ao criar preferência de pagamento.' });
  }
});

app.post('/api/create-subscription', async (req, res) => {
  try {
    const { plan_id } = req.body || {};
    if (!plan_id) return res.status(400).json({ error: 'plan_id é obrigatório.' });
    const checkoutUrl = `https://www.mercadopago.com.br/subscriptions/v1/redirect?plan_id=${plan_id}`;
    res.json({ checkoutUrl });
  } catch (e) {
    console.error('Erro em assinatura:', e?.response?.data || e.message);
    res.status(500).json({ error: 'Falha ao gerar link de assinatura.' });
  }
});

const PORT = process.env.PORT || 3001;        // Cloud Run fornece PORT
const HOST = '0.0.0.0';                        // obrigatório para Cloud Run
app.listen(PORT, HOST, () => {
  console.log(`✅ Servidor on: http://${HOST}:${PORT}`);
});
