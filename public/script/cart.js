

    async function addToCart(productId,buttonId) {
        // Disable the button to avoid multiple clicks
        const button = document.getElementById(buttonId);
        
        try {
            // Send a POST request to add the product to the cart
            const response = await fetch(`/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId })
            });

            const result = await response.json();

            if (result.success) {
                showToast("Your Item added to cart!", "purple");
                
                // Change button text and link to "Go to Cart"
                button.innerHTML = '<i class="bi bi-bag-fill me-2"></i>Go to Cart';
               
                button.onclick=()=>goToCart()
            } else {
                showToast("Failed to add item to cart!", "rgb(107, 38, 126)");
                
                button.innerHTML = '<i class="bi bi-bag-fill me-2"></i>Add to Cart';
            }
        } catch (error) {
            console.error('Error adding product to cart:', error);
            showToast("⚠️ Error adding item to cart!", "purple");
            
        }
    }

    function showToast(message, bgColor) {
        Toastify({
            text: message,
            duration: 500,  
            gravity: "bottom",   
            position: "center", 
            style:{
                background:bgColor
            },
            stopOnFocus: true, 
        }).showToast();
    }
// Function to redirect to cart page
function goToCart() {
    window.location.href = "/cart";
}


