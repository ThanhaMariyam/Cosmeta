// Function to add an item to the wishlist
async function addToWishlist(productId) {
    if (!productId) {
        console.error("Product ID is missing");
        return;
    }

    try {
        const response = await fetch(`/wishlist/add/${productId}`, { // Fix: Send productId as a URL param
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();

        if (data.success) {
            Toastify({
                text: "Added to wishlist 🤍",
                duration: 1000,
                gravity: "bottom",
                position: "center",
                style:{background:"purple"},
            }).showToast();
            const heartIcon = document.querySelector(`[data-id='${productId}'] i`);
            if (heartIcon) {
                heartIcon.classList.remove("bi-heart");
                heartIcon.classList.add("bi-heart-fill");
            }
        } else {
            console.error(data.message);
        }
    } catch (error) {
        console.error("Error adding to wishlist:", error);
    }
}

// Function to remove an item from the wishlist
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
           
            // Change heart icon back to normal
            const heartIcon = document.querySelector(`#wishlist-btn-${productId} i`);
            if (heartIcon) {
                heartIcon.classList.remove("bi-heart-fill");
                heartIcon.classList.add("bi-heart");
            }

            // Remove product from wishlist page dynamically
            const productCard = document.querySelector(`#wishlist-item-${productId}`);
            if (productCard) {
                productCard.remove();
            }

            // Show success toast message
            await Toastify({
                text: "Removed from wishlist",
                duration: 3000,
                close: true,
                gravity: "bottom",
                position: "center",
                style:{background:"purple"},
            }).showToast();
            window.location.reload()
        } else {
            console.error(data.message);
        }
    } catch (error) {
        console.error("Error removing from wishlist:", error);
    }
}
