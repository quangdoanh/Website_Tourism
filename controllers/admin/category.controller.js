const Category = require("../../models/category.model")

module.exports.list = (req, res) => {

    res.render('admin/pages/category-list', {
        pageTitle: "Quản lý danh mục"
    })
}
module.exports.create = (req, res) => {

    res.render('admin/pages/category-create', {
        pageTitle: "Tạo danh mục"
    })
}
module.exports.createPost = async (req, res) => {

    if (req.body.position) {
        req.body.position = parseInt(req.body.position)
    } else {
        const totalDocment = await Category.countDocuments({})
        req.body.position = totalDocment + 1
    }

    req.body.createdBy = req.account.id
    req.body.updatedBy = req.account.id

    const newRecord = new Category(req.body);
    await newRecord.save();

    res.json({
        code: "success",
        message: "Tạo danh mục thành công!"
    })


}