module.exports.dashboard = (req, res) => {

    res.render('admin/pages/dashboard', {
        pageTitle: "Tổng quan"
    })
}