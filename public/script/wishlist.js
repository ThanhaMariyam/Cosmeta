async function addToWishlist(productId) {
  if (!productId) {
    console.error("Product ID is missing");
    return;
  }

  try {
    const response = await fetch(`/wishlist/add/${productId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      Swal.fire({
        icon: "warning",
        title: "Sign In Required",
        text: "You must sign in to add an item to wishlist!",
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

    const data = await response.json();

    if (data.success) {
      Toastify({
        text: "Added to wishlist 🤍",
        duration: 1000,
        gravity: "bottom",
        position: "center",
        style: { background: "purple" },
      }).showToast();
      const button = document.querySelector(`[data-id='${productId}']`);
      if (button) {
        const icon = button.querySelector("i");
        icon.classList.remove("bi-heart");
        icon.classList.add("bi-heart-fill");

        button.setAttribute("onclick", `removeFromWishlist('${productId}')`);
      }
    } else {
      console.error(data.message);
    }
  } catch (error) {
    console.error("Error adding to wishlist:", error);
  }
}

async function removeFromWishlist(productId) {
  if (!productId) {
    console.error("Product ID is missing");
    return;
  }

  try {
    const response = await fetch(`/wishlist/remove/${productId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      await Toastify({
        text: "Removed from wishlist",
        duration: 3000,
        close: true,
        gravity: "bottom",
        position: "center",
        style: { background: "purple" },
      }).showToast();
      const button = document.querySelector(`[data-id='${productId}']`);
      if (button) {
        const icon = button.querySelector("i");
        icon.classList.remove("bi-heart-fill");
        icon.classList.add("bi-heart");

        button.setAttribute("onclick", `addToWishlist('${productId}')`);
      }
      const productCard = document
        .querySelector(`[data-id='${productId}']`)
        .closest(".wishlist-item");
      if (productCard) {
        productCard.remove();
      }
      window.location.reload();
    } else {
      console.error(data.message);
    }
  } catch (error) {
    console.error("Error removing from wishlist:", error);
  }
}
