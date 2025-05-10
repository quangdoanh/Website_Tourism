const Category = require("../../models/category.model")

const CategoryHelpers = require("../../helpers/category.helper")

module.exports.list = (req, res) => {

    res.render('admin/pages/category-list', {
        pageTitle: "Quản lý danh mục"
    })
}
module.exports.create = async (req, res) => {

    const categoryList = await Category.find({

    })

    const categoryTree = CategoryHelpers.CategoryTree(categoryList)

    console.log(categoryTree)

    res.render('admin/pages/category-create', {
        pageTitle: "Tạo danh mục",
        categoryList: categoryTree
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



    // take photo in cloud
    req.body.avatar = req.file ? req.file.path : ""


    const newRecord = new Category(req.body);
    await newRecord.save();

    res.json({
        code: "success",
        message: "Tạo danh mục thành công!"
    })


}