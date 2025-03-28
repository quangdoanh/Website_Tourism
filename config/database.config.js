const mongoose = require('mongoose');

module.exports.connect = async () => {

    try {
        await mongoose.connect(process.env.DATABASE);
        console.log("Ket loi thanh cong")
    } catch (error) {
        console.log(error)
    }
}

