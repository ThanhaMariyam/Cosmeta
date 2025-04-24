
function copyReferralCode() {
    const referralInput = document.getElementById("referralCode");
    navigator.clipboard.writeText(referralInput.value.trim())
        .then(() => {
            Toastify({
                text: "Copied!",
                duration: 1500,
                position: "left", 
                offset: {
                    x: 130, 
                    y: 200 
                },
                style: {
                    background: "white",
                    color: "black",
                    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", 
                    borderRadius: "6px", 
                    padding: "10px 15px" 
                }
            }).showToast();
        })
        .catch(() => {
            Toastify({
                text: "Failed to copy!",
                duration: 1500,
                gravity: "bottom",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff416c, #ff4b2b)",
            }).showToast();
        });
}
