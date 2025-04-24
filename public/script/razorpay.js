function openRazorpay(razorpayOrder, key) {
  const options = {
    key: key,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    name: "Cosmeta",
    description: "Order Payment",
    order_id: razorpayOrder.id,
    retry: {
      enabled: false,
    },
    handler: function (response) {
      verifyRazorpayPayment(response);
    },
    prefill: {
      name: "Guest User",
      email: "guest@example.com",
      contact: "0000000000",
    },
    modal: {
      ondismiss: function () {
        window.location.href = `/orderFailure?orderId=${razorpayOrder.id}`;
      },
    },
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

function verifyRazorpayPayment(paymentData) {
  fetch("/verifyPayment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentData),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        Swal.fire({
          title: "Payment Successful!",
          text: "Your order has been placed successfully.",
          icon: "success",
          confirmButtonColor: "#742070",
        }).then(() => {
          window.location.href = "/orderConfirmation";
        });
      } else {
        Swal.fire({
          title: "Payment Failed",
          text: "Something went wrong. Please try again.",
          icon: "error",
          confirmButtonColor: "#742070",
        }).then(() => {
          window.location.href = `/orderFailure?orderId=${paymentData.orderId}`;
        });
      }
    })
    .catch((error) => {
      Swal.fire(
        "Error",
        "Payment verification failed. Please try again.",
        "error"
      );
    });
}
