const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
const nextId = require("../utils/nextId");

function list(req, res) {
  res.json({ data: orders });
}

function orderValidation(req, res, next) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;

  let message;
  if(!deliverTo || deliverTo === "")
    message = "Order must include a deliverTo";
  else if(!mobileNumber || mobileNumber === "")
	message = "Order must include a mobileNumber";
  else if(!dishes)
	message = "Order must include a dish";
  else if(!Array.isArray(dishes) || dishes.length === 0)
	message = "Order must include at least one dish";
  else {
	for(let i = 0; i < dishes.length; i++) {
      if(!dishes[i].quantity || dishes[i].quantity <= 0 || !Number.isInteger(dishes[i].quantity))
        message = `Dish ${i} must have a quantity that is an integer greater than 0`;
      }
  }
  if(message) {
	return next({
      status: 400,
      message: message,
    });
  }
  next();
}

function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order id not found: ${req.params.orderId}`,
  });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;

  const newOrder = {
      id: nextId(),
      deliverTo: deliverTo,
      mobileNumber: mobileNumber,
      status: "pending",
      dishes: dishes,
  }
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function orderStatusValidation(req, res, next) {
	const orderId = req.params.orderId;
	const { data: { id, status } = {} } = req.body;
	let message;
	if(id && id !== orderId)
		message = `Order id does not match route id. Order: ${id}, Route: ${orderId}`
	else if(!status || status === "" || (status !== "pending" && status !== "preparing" && status !== "out-for-delivery"))
		message = "Order must have a status of pending, preparing, out-for-delivery, delivered";
	else if(status === "delivered")
		message = "A delivered order cannot be changed"
  
	if(message) {
		return next({
			status: 400,
			message: message,
		});
	}
	next();
}

function update(req, res) {

  const { data: { deliverTo, mobileNumber, status, dishes} = {} } = req.body;
  res.locals.order.deliverTo = deliverTo;
  res.locals.order.mobileNumber = mobileNumber;
  res.locals.order.status = status;
  res.locals.order.dishes = dishes;
  res.json({ data: res.locals.order });
}

function destroy(req, res) {
  const orderId = req.params.orderId;
  const index = orders.findIndex((order) => order.id === orderId);
  if (index > -1) {
    orders.splice(index, 1);
  }
  res.sendStatus(204);
}

function deleteStatusValidation(req, res, next) {
	if(res.locals.order.status !== "pending") {
      next({
      status: 400,
      message: "An order cannot be deleted unless it is pending",
	});
  }
  next();
}

module.exports = {
  list,
  create: [orderValidation, create],
  read: [orderExists, read],
  update: [orderExists, orderValidation, orderStatusValidation, update],
  delete: [orderExists, deleteStatusValidation, destroy],
};