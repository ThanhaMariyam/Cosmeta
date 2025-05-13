

async function addToCart(productId) {
  try {
    const response = await fetch(`/cart/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ productId }),
    });

    if (response.status === 401) {
      Swal.fire({
        icon: "warning",
        title: "Sign In Required",
        text: "You must sign in to add an item to cart!",
        width: 400,
        confirmButtonColor: "#6b247e",
        confirmButtonText: "Go to Login",
      }).then((result) => {
        if (result.isConfirmed) {
          window.location.href = "/login";
        }
      });
      return;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Non-JSON response from server");
    }

    const result = await response.json();

    if (result.success) {
      showToast("Your Item added to cart!", "purple");

      const allButtons = document.querySelectorAll(
        `.add-cart-btn[data-product-id="${productId}"]`
      );
      allButtons.forEach((button) => {
        button.innerHTML = '<i class="bi bi-bag-fill me-2"></i>Go to Cart';
        button.setAttribute("onclick", "goToCart()");
      });
    } else {
      showToast("Failed to add item to cart!", "rgb(107, 38, 126)");
    }
  } catch (error) {
    console.error("Error adding product to cart:", error);
    showToast("Error adding item to cart!", "purple");
  }
}

function showToast(message, bgColor) {
  Toastify({
    text: message,
    duration: 500,
    gravity: "bottom",
    position: "center",
    style: {
      background: bgColor,
    },
    stopOnFocus: true,
  }).showToast();
}

function goToCart() {
  window.location.href = "/cart";
}
