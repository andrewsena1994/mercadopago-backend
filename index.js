require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN; // coloque no .env
if (!ACCESS_TOKEN) {
  console.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN não definido no .env');
}

/**
 * Cria uma preferência de pagamento (compra avulsa)
 */
app.post('/api/create-payment-preference', async (req, res) => {
  try {
    const { title = 'Créditos', quantity = 1, unit_price = 39.9, description = 'Compra de créditos' } = req.body || {};

    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      {
        items: [
          {
            title,
            quantity,
            unit_price,
            currency_id: 'BRL',
            description
          }
        ],
        back_urls: {
          success: 'https://seusite.com/sucesso',
          pending: 'https://seusite.com/pendente',
          failure: 'https://seusite.com/erro'
        },
        auto_return: 'approved',
        // notification_url: 'https://seu-backend.com/webhooks/mercadopago' // (opcional) para receber webhooks
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const checkoutUrl = response.data.init_point || response.data.sandbox_init_point;
    return res.json({ checkoutUrl });
  } catch (err) {
    console.error('Erro ao criar preferência:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Falha ao criar preferência de pagamento.' });
  }
});

/**
 * Assinatura: se você já tem um plan_id criado no Mercado Pago,
 * podemos simplesmente devolver a URL de redirecionamento oficial.
 * (Opcional: validar o plan_id com a API antes de retornar)
 */
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { plan_id } = req.body || {};
    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id é obrigatório.' });
    }

    // Opcional: validar o plano
    // const plan = await axios.get(`https://api.mercadopago.com/preapproval_plan/${plan_id}`, {
    //   headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
    // });

    const checkoutUrl = `https://www.mercadopago.com.br/subscriptions/v1/redirect?plan_id=${plan_id}`;
    return res.json({ checkoutUrl });
  } catch (err) {
    console.error('Erro em assinatura:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Falha ao gerar link de assinatura.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});
