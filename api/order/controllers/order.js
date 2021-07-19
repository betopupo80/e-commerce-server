"use strict";
const fetch = require("node-fetch");
const { default: createStrapi } = require("strapi");
const API_WOMPI = "https://sandbox.wompi.co/v1";
const stripe = require("stripe")(
  "sk_test_51IvrbXGjlRGAGaXaUxd2ugdXgq4LjNLx8ztEQWR086V9iiSgob76KakeUYr1NFkMT7auNaXfANLuxGSnMh7vuSGm00JXdSfJpF"
);

const wompi_private = "prv_test_l2MR74Bhy6Cu62o55ktMlOdnyDlJsmVt";

//const date = Date.now();
//const dateString = date.toString();
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const {
      tokenWompi,
      wompiAcceptanceToken,
      products,
      idUser,
      email,
      fullname,
      references,
      addressShipping
    } = ctx.request.body;
    let totalPayment = 0;
    products.forEach(product => {
      totalPayment +=
        (product.price - (product.price * product.discount) / 100) *
        product.quantity;
    });

    //PARA STRIPE
    // const charge  = await stripe.charges.create({
    //     amount: totalPayment * 100,
    //     currency: "eur",
    //     source: tokenStripe,
    //     description: `ID Usuario: ${idUser}`
    // })

    //
    const transaction = {
      acceptance_token: wompiAcceptanceToken,
      amount_in_cents: totalPayment * 100,
      currency: "COP",
      customer_email: email,
      payment_method: {
        type: "CARD",
        token: tokenWompi,
        installments: 12
      },
      reference: references,
      customer_data: {
        full_name: fullname
      },
      shipping_address: {
        address_line_1: addressShipping.address,
        country: "CO",
        region: addressShipping.state,
        city: addressShipping.city,
        name: addressShipping.name_lastname,
        phone_number: addressShipping.phone
      }
    };

    const charge = await transacctionWompi(transaction);
    //console.log(charge);

    const createOrder = [];
    for await (const product of products) {
      const data = {
        product: product.id,
        user: idUser,
        totalPayment: totalPayment,
        productsPayment:
          (product.price - (product.price * product.discount) / 100) *
          product.quantity,
        quantity: product.quantity,
        idPayment: references,
        addressShipping
      };

      const valiData = await strapi.entityValidator.validateEntityCreation(
        strapi.models.order,
        data
      );

      const entry = await strapi.query("order").create(valiData);
      createOrder.push(entry);
    }

    return createOrder;
  }
};

async function transacctionWompi(transaction) {
  try {
    const url = `${API_WOMPI}/transactions`;
    const params = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${wompi_private}`
      },
      body: JSON.stringify(transaction)
    };
    const response = await fetch(url, params);
    const result = await response.json();
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
}
