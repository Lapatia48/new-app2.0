# URLs import et verification

Base API: http://localhost:5173/prestashop/api
Cle: ws_key=VOTRE_CLE

## Imports (POST)
- POST /categories
- POST /products
- POST /product_options
- POST /product_option_values
- POST /combinations
- POST /stock_availables
- POST /customers
- POST /addresses
- POST /carts
- POST /orders
- POST /order_details
- POST /order_histories
- POST /images/products/{id_product}

## Verification (GET)
- GET /categories?display=[id,name]
- GET /products?display=[id,reference,name,price]
- GET /product_options?display=[id,name,group_type]
- GET /product_option_values?display=[id,name,id_attribute_group]
- GET /combinations?display=full&filter[id_product]=ID_PRODUIT
- GET /stock_availables?display=[id,id_product,id_product_attribute,quantity]
- GET /customers?display=[id,email,firstname,lastname]
- GET /addresses?display=[id,id_customer,alias,address1,city]
- GET /carts?display=full&filter[id_customer]=ID_CLIENT
- GET /orders?display=[id,id_customer,current_state,total_paid]
- GET /order_details?display=full&filter[id_order]=ID_COMMANDE
- GET /order_histories?display=[id,id_order,id_order_state]

## Exemple complet avec cle
http://localhost:5173/prestashop/api/products?ws_key=VOTRE_CLE&display=[id,reference,name,price]
