// Models
const Tour = require("../../models/tour.model")
const moment = require("moment");

module.exports.home = async (req, res) => {

    // Section 2
    const tourListSection2 = await Tour
        .find({
            deleted: false,
            status: "active"
        })
        .sort({
            position: "desc"
        })
        .limit(6)



    for (const item of tourListSection2) {
        item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");

    }


    // End Section 2


    res.render('clients/pages/home.pug', {
        pageTitle: "Trang chủ",
        tourListSection2: tourListSection2
    })
}
