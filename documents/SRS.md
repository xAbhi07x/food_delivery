# Software Requirements Specification (SRS)
## Murliganj Food Ordering & Delivery Platform

**Version:** 1.0  
**Date:** 22 November 2026  
**Project location:** Murliganj, Madhepura, Bihar, India  
**Product type:** Hyperlocal food ordering and delivery platform  
**Development approach:** GitHub Copilot-assisted development

---

# 1. Project Overview

## 1.1 Purpose

Develop a local food ordering and delivery platform for Murliganj, inspired by Zomato and Swiggy, but with a product-centric business model.

Customers browse food products, not restaurants.

The business maintains its own catalog and selling prices. When a customer orders, the business handles the necessary offline sourcing and delivery operations.

The application is responsible for:

- Food catalog and pricing.
- Customer accounts and orders.
- Rider availability and assignment.
- Delivery progress.
- Customer-rider communication.
- Live delivery tracking.
- Administration and operational monitoring.

The application is not responsible for supplier procurement or inventory management.

## 1.2 Business model

1. The platform displays a centralized food catalog.
2. Customers select one or more food products.
3. Customers place an order for delivery.
4. The order becomes available to eligible riders.
5. A rider accepts the order.
6. The rider completes the pickup and delivery.
7. The customer tracks the order until delivery.

The customer does not need to know where the business sourced the food.

## 1.3 Capacity targets

| Metric | Requirement |
|---|---:|
| Initial riders | 2 |
| Maximum supported riders | 20 |
| Maximum active orders per rider | 5 |
| Target daily orders | 500 |
| Initial payment method | Cash on Delivery |
| Initial delivery coverage | Approximately 5 km |
| Pickup/delivery model | One pickup and one customer delivery per order |

These are design targets. Production capacity must be validated through load testing.

---

# 2. Scope

## 2.1 In scope

- Customer-facing food catalog.
- Product categories and search.
- Product customisation.
- Shopping cart and checkout.
- Mobile OTP authentication.
- Cash on Delivery.
- Configurable delivery fees.
- Delivery address and location capture.
- Service-area validation.
- Rider registration and availability.
- Multi-order rider assignment.
- Maximum five active orders per rider.
- Independent order status management.
- Rider-customer calling.
- Live rider tracking.
- Delivery ETA.
- Admin dashboard.
- Cancellation and exception handling.
- Basic order and operational reporting.

## 2.2 Explicitly out of scope

The following are not part of the initial application:

- Restaurant/vendor registration.
- Restaurant-wise browsing.
- Supplier management.
- Procurement management.
- Inventory management.
- Stock management.
- Multiple pickups within one order.
- Multiple riders for one order.
- Automated delivery route optimization.
- Loyalty programs.
- Subscription services.
- AI-based recommendations.
- Native mobile applications.
- Online payment gateway integration.

---

# 3. User Roles and Permissions

The platform has three principal roles.

## 3.1 Customer

A customer can:

- Register and log in using mobile OTP.
- Browse products and categories.
- Search for products.
- View product details and prices.
- Configure product customisations.
- Add multiple products to the cart.
- Change item quantities.
- Add delivery addresses.
- Select a delivery location.
- Place orders during operating hours.
- Pay through Cash on Delivery.
- View current and previous orders.
- Cancel an order before rider acceptance.
- Request cancellation after rider acceptance.
- View assigned rider details.
- Call the assigned rider.
- Track rider location.
- View estimated delivery time.

Customers cannot:

- Modify confirmed order prices.
- Change an order's assigned rider.
- Update order status.
- View another customer's orders.
- Access rider or administrator information beyond what is necessary for their order.

## 3.2 Rider

A rider can:

- Log in using their assigned account.
- Set availability to online or offline.
- Receive available order notifications.
- Review order details.
- Accept an order.
- Reject an order.
- Hold up to five active orders.
- View all their active orders.
- Choose their delivery sequence.
- Update each order independently.
- Confirm pickup.
- Start delivery.
- Share GPS location during active deliveries.
- Call or contact customers where appropriate.
- Confirm delivery.
- Report delivery problems.

A rider cannot:

- Accept more than five active orders.
- Access orders assigned to another rider as if they were their own.
- Change product prices.
- Change customer order totals.
- Mark an order delivered without satisfying the delivery workflow.
- Access customer location data unrelated to their assigned deliveries.

## 3.3 Administrator

An administrator can:

- Manage products.
- Manage categories.
- Manage prices.
- Configure product customisations.
- Mark products available or unavailable.
- Manage riders.
- Activate and deactivate riders.
- View and manage orders.
- Monitor active deliveries.
- Handle cancellation requests.
- Handle rejected or unassigned orders.
- Reassign orders in exceptional situations.
- Configure operating hours.
- Configure delivery fees.
- Configure service coverage.
- View customer information necessary for operations.
- View basic operational reports.

---

# 4. Functional Requirements

## 4.1 Authentication

**FR-AUTH-01:** Customers must authenticate using mobile OTP.

**FR-AUTH-02:** OTP verification must be performed by a trusted authentication service.

**FR-AUTH-03:** Riders must have authenticated accounts and the rider role.

**FR-AUTH-04:** Administrators must have authenticated accounts and the administrator role.

**FR-AUTH-05:** Role authorization must be enforced on the server and database, not merely by hiding frontend pages.

**FR-AUTH-06:** OTP endpoints must have appropriate rate limits and abuse protection.

The OTP provider and its commercial pricing will be selected before implementation.

## 4.2 Product catalog

**FR-PROD-01:** Administrators can create, edit and deactivate products.

**FR-PROD-02:** Each product contains:

- Product name.
- Description.
- Image.
- Category.
- Selling price.
- Availability status.
- Customisation configuration.
- Display order.

**FR-PROD-03:** Customers can browse products by category.

**FR-PROD-04:** Customers can search for products.

**FR-PROD-05:** Unavailable products cannot be added to a new cart or submitted as a valid new order.

**FR-PROD-06:** Product changes must not alter historical order records.

## 4.3 Product customisation

Administrators can configure customisation individually for each product.

Supported types:

1. Variants: size, portion, flavour, etc.
2. Add-ons: extra cheese, toppings, extra patty, etc.
3. Special instructions: customer-entered text.

Each customisation group can have:

- A name.
- A selection type.
- Required or optional selection.
- Minimum selections.
- Maximum selections.
- Available options.
- Additional price per option.
- Active/inactive status.

Example:

**Veg Burger — ₹99**

- Regular: included.
- Large: +₹30.
- Extra cheese: +₹20.
- Extra patty: +₹35.

The system must calculate the final item price on the server.

The customer must see the final amount before checkout.

Order items must retain a snapshot of selected customisations and their prices.

## 4.4 Shopping cart

**FR-CART-01:** A customer can add multiple products to one cart.

**FR-CART-02:** Customers can change quantities and remove products.

**FR-CART-03:** Customers can change product customisations before placing the order.

**FR-CART-04:** The cart must display:

- Product name.
- Quantity.
- Selected customisations.
- Item price.
- Item total.
- Subtotal.
- Delivery fee.
- Final amount.

**FR-CART-05:** Prices must be revalidated on the server during checkout.

## 4.5 Checkout and order creation

**FR-ORDER-01:** Customers must provide a valid mobile number and delivery address.

**FR-ORDER-02:** Delivery location should be captured using map coordinates and an address description.

**FR-ORDER-03:** The platform must validate whether the delivery location is within the configured service area.

**FR-ORDER-04:** Customers can place orders only during operating hours.

**FR-ORDER-05:** Orders submitted outside operating hours must be rejected with a clear message.

**FR-ORDER-06:** The backend must enforce operating hours.

**FR-ORDER-07:** Duplicate order submissions must be prevented.

**FR-ORDER-08:** The server must calculate the order total from trusted product and configuration records.

**FR-ORDER-09:** The order must store product, price and customisation snapshots.

## 4.6 Payment

**FR-PAY-01:** Cash on Delivery is the initial payment method.

**FR-PAY-02:** The customer must see the total amount payable.

**FR-PAY-03:** Each COD order must have a payment status.

Suggested payment statuses:

- `PENDING`
- `PAID`
- `FAILED`
- `REFUNDED` (reserved for future online payments)

**FR-PAY-04:** The rider or authorized administrator can record COD collection.

Online payments can be introduced later without redesigning the complete order model.

## 4.7 Delivery fee

**FR-FEE-01:** The administrator can configure a fixed delivery fee.

**FR-FEE-02:** The delivery fee can be set to zero.

**FR-FEE-03:** The customer must see the delivery fee during checkout.

**FR-FEE-04:** The delivery fee must be stored as an order snapshot.

Changing the delivery fee must not modify existing orders.

## 4.8 Delivery coverage

**FR-AREA-01:** Initial service coverage is approximately 5 km around Murliganj.

**FR-AREA-02:** Customers should be prevented from checking out outside the configured service area.

**FR-AREA-03:** Riders must be able to reject an order before accepting it if they identify a coverage problem.

**FR-AREA-04:** Rejection must record a reason.

**FR-AREA-05:** Rejected orders should remain available to other eligible riders unless the order has been cancelled or otherwise closed.

The exact geographic center and boundary must be configured by the administrator or development team before launch.

## 4.9 Rider availability and assignment

**FR-RIDER-01:** Riders can switch between online and offline.

**FR-RIDER-02:** Only online and active riders can accept new orders.

**FR-RIDER-03:** Eligible riders receive notifications about new orders.

**FR-RIDER-04:** Riders can review relevant order details before accepting.

**FR-RIDER-05:** One order can have only one assigned rider.

**FR-RIDER-06:** A rider can have a maximum of five active orders.

**FR-RIDER-07:** The five-order capacity limit must be enforced atomically by the backend.

**FR-RIDER-08:** The rider can choose the sequence in which accepted orders are fulfilled.

**FR-RIDER-09:** Each order must have an independent status and status history.

**FR-RIDER-10:** Once an order is delivered or cancelled, it no longer consumes active-order capacity.

**FR-RIDER-11:** If no rider accepts an order, it remains pending until the administrator intervenes or the order expires.

**FR-RIDER-12:** Administrator reassignment is available for exceptional situations.

### Flexible multi-order delivery

A rider may accept five orders and decide the delivery sequence.

The system must not assume that all five orders are picked up or delivered simultaneously.

Each order retains its own pickup confirmation, delivery progress and completion.

Automatic route optimization is not required in the initial version.

## 4.10 Order pickup and delivery

Each customer order has one pickup confirmation and one delivery destination.

Suggested statuses:

- `PENDING_ASSIGNMENT`
- `ACCEPTED`
- `PICKUP_IN_PROGRESS`
- `PICKED_UP`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `CANCELLED`
- `REJECTED`

Status changes must follow valid transitions.

For example:

`PENDING_ASSIGNMENT → ACCEPTED → PICKUP_IN_PROGRESS → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED`

The application must prevent arbitrary status changes.

The rider can update each assigned order independently.

## 4.11 Customer-rider communication

**FR-COMM-01:** Once an order is accepted, the customer can see the assigned rider's name and phone number.

**FR-COMM-02:** The customer can use a Call Rider button to initiate a phone call.

**FR-COMM-03:** Calling uses the device's phone dialler through a `tel:` link.

**FR-COMM-04:** Only the relevant customer can view the phone number for their assigned order.

**FR-COMM-05:** Rider contact information must not be publicly exposed.

Initial implementation uses direct phone calling. Number masking can be considered later.

## 4.12 Live tracking

**FR-TRACK-01:** Rider location is shared during active delivery operations.

**FR-TRACK-02:** Location updates are periodically transmitted while tracking is active.

**FR-TRACK-03:** Customers can view the assigned rider's location.

**FR-TRACK-04:** Customers cannot view riders assigned to unrelated orders.

**FR-TRACK-05:** The system must indicate when location information becomes stale.

**FR-TRACK-06:** Location sharing stops after the relevant delivery is completed or cancelled.

**FR-TRACK-07:** A rider's location may support multiple active orders, but access must be restricted to customers assigned to that rider.

Initial implementation will use mobile-browser geolocation while the rider's delivery interface is active. Reliable background tracking is not guaranteed by a browser-based PWA and must be evaluated separately.

## 4.13 Estimated delivery time

**FR-ETA-01:** Each customer order must have an estimated delivery time.

**FR-ETA-02:** ETA should account for:

- Order fulfillment time.
- Rider's current location.
- Remaining delivery distance.
- Existing active deliveries.
- Rider's chosen delivery sequence.

**FR-ETA-03:** ETA should be updated when meaningful delivery conditions change.

**FR-ETA-04:** The system should display an approximate time or range, not imply perfect accuracy.

## 4.14 Operating hours

**FR-HOURS-01:** The administrator can configure opening and closing times.

**FR-HOURS-02:** Customers cannot place orders outside operating hours.

**FR-HOURS-03:** The backend must reject out-of-hours order creation.

**FR-HOURS-04:** Riders cannot accept new orders after closing time.

**FR-HOURS-05:** Pending, unaccepted orders must be closed or rejected at closing time.

**FR-HOURS-06:** Orders already accepted before closing may continue through pickup and delivery after closing.

**FR-HOURS-07:** Operating-hour checks must use the configured local timezone: `Asia/Kolkata`.

## 4.15 Cancellation and rejection

### Proposed cancellation policy

| Situation | Behaviour |
|---|---|
| Before rider acceptance | Customer can cancel |
| After rider acceptance | Customer requests cancellation; admin handles it |
| Pickup in progress | Admin handles cancellation |
| After pickup | Admin handles exceptional cancellation |
| Out for delivery | Admin handles exceptional cancellation |
| Delivered | Cancellation unavailable |

### Rejection

An order may be rejected when:

- It is outside operating hours.
- No eligible rider accepts it before the applicable deadline.
- The business cannot fulfill the order.
- A product is unavailable and the business decides not to fulfill the order.

Rejection and cancellation must be recorded separately.

Every cancellation or rejection should retain:

- Reason.
- Initiating user or system.
- Timestamp.
- Relevant order status at the time.

For COD, there is no payment refund to process. Future online payment support will require a refund workflow.

---

# 5. Order State Machine

## 5.1 Normal order flow

`PENDING_ASSIGNMENT → ACCEPTED → PICKUP_IN_PROGRESS → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED`

## 5.2 Cancellation flow

Before acceptance:

`PENDING_ASSIGNMENT → CANCELLED`

After acceptance, an administrator handles the cancellation request and records the resulting decision.

## 5.3 Rejection flow

`PENDING_ASSIGNMENT → REJECTED`

This applies to orders the business cannot fulfill or orders that expire without rider acceptance.

## 5.4 Important transition rules

- A delivered order cannot return to an earlier status.
- A cancelled order cannot be accepted.
- A rejected order cannot be accepted.
- A rider cannot update an order that is not assigned to them.
- Only authorized actors can perform status transitions.
- Every transition must be logged.
- Status changes must be validated on the server.

---

# 6. Proposed Database Design

The database will use PostgreSQL.

## 6.1 Main tables

### `profiles`
- id
- full_name
- phone
- role
- created_at
- updated_at

Roles: `CUSTOMER`, `RIDER`, `ADMIN`.

### `customer_addresses`
- id
- customer_id
- address
- landmark
- latitude
- longitude
- created_at

### `categories`
- id
- name
- image_url
- display_order
- is_active

### `products`
- id
- category_id
- name
- description
- image_url
- base_price
- is_available
- created_at
- updated_at

### `customization_groups`
- id
- product_id
- name
- selection_type
- is_required
- min_selections
- max_selections
- is_active

### `customization_options`
- id
- group_id
- name
- additional_price
- is_available

### `orders`
- id
- order_number
- customer_id
- rider_id
- status
- subtotal
- delivery_fee
- total_amount
- payment_method
- payment_status
- delivery_address_snapshot
- delivery_landmark_snapshot
- delivery_latitude
- delivery_longitude
- estimated_delivery_at
- created_at
- updated_at

### `order_items`
- id
- order_id
- product_id
- product_name_snapshot
- base_price_snapshot
- quantity
- item_total

### `order_item_customizations`
- id
- order_item_id
- customization_group_name_snapshot
- option_name_snapshot
- additional_price_snapshot

### `rider_profiles`
- id
- user_id
- is_available
- is_active
- last_seen_at

### `rider_locations`
- id
- rider_id
- latitude
- longitude
- accuracy
- recorded_at

### `order_status_history`
- id
- order_id
- previous_status
- new_status
- changed_by
- reason
- created_at

### `business_settings`
- id
- setting_key
- setting_value
- updated_by
- updated_at

Settings include:

- Delivery fee.
- Opening time.
- Closing time.
- Timezone.
- Service-area configuration.
- Maximum active orders per rider.

## 6.2 Important database constraints

The database must enforce:

1. One rider per order.
2. One customer per customer-owned order.
3. Valid product prices and quantities.
4. Valid foreign-key relationships.
5. Valid order statuses.
6. Atomic rider assignment.
7. Maximum five active orders per rider.
8. Valid order-item customisations.
9. No client-side authority over order totals.

The five-order limit requires transactional assignment logic and appropriate database locking or equivalent concurrency protection. A simple frontend count is insufficient.

## 6.3 Historical data

Order records must retain snapshots of:

- Product names.
- Product prices.
- Customisation names.
- Customisation prices.
- Delivery fee.
- Delivery address.

Historical orders must remain understandable even if products, prices or addresses are subsequently changed.

---

# 7. System Architecture

## 7.1 Recommended stack

| Layer | Technology |
|---|---|
| Web application | Next.js |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Maps | Selected mapping provider |
| Deployment | Managed Next.js hosting |
| Source control | GitHub |
| AI coding assistant | GitHub Copilot |

## 7.2 Architecture approach

Use a modular monolith.

One application contains:

- Customer interface.
- Rider interface.
- Admin interface.
- Server-side application logic.
- Database access.
- Realtime integrations.

Do not introduce microservices or distributed infrastructure without evidence that the application needs them.

## 7.3 Main application modules

- Authentication
- Customer management
- Product catalog
- Customisation
- Cart
- Checkout
- Order management
- Rider management
- Assignment
- Delivery tracking
- Notifications
- Administration
- Reporting

Modules should have clear responsibilities and interfaces.

---

# 8. Security Requirements

The following are mandatory:

1. Enforce role-based authorization server-side.
2. Enable and correctly configure PostgreSQL Row Level Security.
3. Never expose privileged Supabase keys in browser code.
4. Validate all user input.
5. Recalculate order prices on the server.
6. Use transactional order acceptance.
7. Restrict customer order access to the owning customer.
8. Restrict rider access to assigned orders.
9. Restrict GPS access to relevant customers and administrators.
10. Protect OTP endpoints against abuse.
11. Validate image uploads.
12. Apply appropriate API rate limits.
13. Maintain audit histories for sensitive operations.
14. Use HTTPS in production.
15. Keep secrets in environment variables or a suitable secret manager.

Customer addresses, mobile numbers and GPS information must not be exposed unnecessarily.

---

# 9. Non-Functional Requirements

## 9.1 Performance

The application should be designed for:

- 500 orders/day.
- Up to 20 riders.
- Up to five active orders per rider.
- Concurrent customer sessions.
- Concurrent rider order acceptance.
- Multiple simultaneous tracking sessions.

Peak-hour load testing is mandatory.

## 9.2 Reliability

The system must handle:

- Temporary network interruptions.
- Duplicate checkout requests.
- Duplicate notifications.
- Concurrent rider acceptance attempts.
- Rider going offline.
- Stale GPS updates.
- Failed OTP delivery.
- Failed realtime connections.
- Database transaction failures.

The database is the source of truth. Realtime notifications are not a replacement for persistent records.

## 9.3 Usability

- Mobile-first customer interface.
- Mobile-first rider interface.
- Simple administrator dashboard.
- Clear prices and totals.
- Clear order statuses.
- Clear error messages.
- Minimal steps to complete an order.

## 9.4 Maintainability

- TypeScript throughout the application.
- Consistent code structure.
- Documented database schema.
- Version-controlled SQL migrations.
- Reusable components.
- Automated tests.
- Clear environment configuration.
- Regular Git commits.

---

# 10. Acceptance Criteria

The application cannot be considered ready until the following scenarios work.

| ID | Scenario | Expected result |
|---|---|---|
| AC-01 | Customer logs in with OTP | Authenticated customer session |
| AC-02 | Customer browses products | Available products displayed |
| AC-03 | Customer customises a product | Correct customisation price |
| AC-04 | Customer adds multiple products | Correct cart total |
| AC-05 | Customer submits order during hours | Order created successfully |
| AC-06 | Customer submits order after hours | Order rejected |
| AC-07 | Customer submits out-of-area address | Checkout prevented |
| AC-08 | Customer selects COD | COD order created |
| AC-09 | Rider accepts an order | Order assigned to that rider |
| AC-10 | Two riders accept simultaneously | Only one succeeds |
| AC-11 | Rider already has five active orders | Sixth order acceptance rejected |
| AC-12 | Rider accepts multiple orders | Each order tracked independently |
| AC-13 | Rider completes one delivery | One slot becomes available |
| AC-14 | Customer calls rider | Device dialler opens |
| AC-15 | Rider updates GPS | Authorized customer sees updated location |
| AC-16 | Rider location stops updating | Customer sees stale-location indication |
| AC-17 | Customer cancels before acceptance | Order cancelled |
| AC-18 | Customer requests cancellation after acceptance | Admin handles request |
| AC-19 | Rider tries to accept after closing | Acceptance rejected |
| AC-20 | Accepted order continues after closing | Delivery can still be completed |
| AC-21 | Admin changes delivery fee | New orders use new fee; old orders remain unchanged |
| AC-22 | Admin changes product price | Historical order price remains unchanged |

---

# 11. Development Roadmap

Development should proceed in this order.

## Stage 1 — Foundation
- Repository setup.
- Next.js and TypeScript.
- Tailwind and UI components.
- Supabase project.
- Environment variables.
- Database migrations.
- Testing setup.
- Copilot instructions.

## Stage 2 — Authentication and authorization
- Customer OTP.
- Rider authentication.
- Admin authentication.
- Role permissions.
- RLS policies.

## Stage 3 — Product catalog
- Categories.
- Products.
- Product images.
- Pricing.
- Availability.
- Customisation groups and options.

## Stage 4 — Customer ordering
- Product pages.
- Cart.
- Customisation.
- Address management.
- Service-area validation.
- Checkout.
- COD order creation.

## Stage 5 — Rider management
- Rider profiles.
- Availability.
- Order notifications.
- Order acceptance.
- Atomic capacity enforcement.
- Multiple active orders.

## Stage 6 — Delivery management
- Independent order status transitions.
- Flexible delivery sequencing.
- Pickup confirmation.
- Delivery confirmation.
- Customer-rider calling.
- GPS tracking.
- ETA.

## Stage 7 — Admin dashboard
- Product management.
- Rider management.
- Order monitoring.
- Cancellation handling.
- Operating hours.
- Delivery fee settings.
- Service-area settings.

## Stage 8 — Testing and deployment
- Unit testing.
- Integration testing.
- End-to-end testing.
- Security testing.
- Mobile testing.
- Concurrent acceptance testing.
- Peak-load testing.
- Production deployment.
- Monitoring and backups.

---

# 12. Decisions Still to Finalize

These are configuration and operational details, not reasons to complicate the architecture.

| Decision | Current position |
|---|---|
| Exact opening and closing hours | To be configured |
| Exact service-area boundary | Approximately 5 km; boundary to be finalized |
| Delivery fee amount | Admin configurable |
| OTP provider | To be selected |
| Map provider | To be selected |
| Rider notification channel | To be selected |
| Exact cancellation reasons | To be configured |
| COD collection confirmation | To be finalized |
| Customer support contact | To be configured |
| Rider background GPS tracking | Not guaranteed in initial PWA |

---

# 13. Definition of MVP Completion

The MVP is complete when:

1. An administrator can manage the food catalog.
2. Customers can authenticate and order multiple food products.
3. Customers can customise products.
4. Checkout validates operating hours and delivery coverage.
5. COD orders can be created.
6. Riders can independently accept orders.
7. Each rider can handle up to five active orders.
8. Riders can decide their delivery sequence.
9. Every order has its own delivery status.
10. Customers can call their assigned rider.
11. Customers can track the rider during delivery.
12. Administrators can manage operational exceptions.
13. The system passes its critical security and load tests.

**Final product principle: Build a simple food ordering and delivery business platform, not a restaurant marketplace or a complex logistics management system.**