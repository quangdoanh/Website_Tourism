const Category = require("../../models/category.model")

const accountAdmin = require("../../models/accountAdmin.model")

const slugify = require('slugify');
slugify.extend({ 'đ': 'd', 'Đ': 'D' });

const CategoryHelpers = require("../../helpers/category.helper")

const moment = require("moment/moment")
const { object } = require("joi")


// ---------- List--------------
module.exports.list = async (req, res) => {

  const find = {
    deleted: false,
  }

  // status
  if (req.query.status) {
    find.status = req.query.status
  }
  // name
  if (req.query.name) {
    find.createdBy = req.query.name
  }

  //Filter Date
  const FilterDate = {}

  //dateStart
  if (req.query.dateStart) {
    const startDate = moment(req.query.dateStart).startOf("date").toDate();
    FilterDate.$gte = startDate;

  }
  //dateEnd
  if (req.query.dateEnd) {
    const endDate = moment(req.query.dateEnd).endOf("date").toDate();
    FilterDate.$lte = endDate;
  }
  //object.keys(FilterDate) : trả về 1 mảng key

  if (Object.keys(FilterDate).length > 0) {
    find.createdAt = FilterDate;
  }

  // Tìm kiếm

  if (req.query.keyword) {
    const keyword = slugify(req.query.keyword, {
      lower: true
    });
    const keywordRegex = new RegExp(keyword);
    find.slug = keywordRegex;
  }

  // Phân trang 
  const limit = 3;

  let page = 1

  if (req.query.page) {
    const pageCurrent = parseInt(req.query.page);
    if (pageCurrent > 0) {
      page = pageCurrent
    }
  }

  const skip = (page - 1) * limit

  const totalCategory = await Category.find({
    deleted: false,
  })

  const totalPage = Math.ceil(totalCategory.length / limit)

  const pagination = {
    skip: skip,
    totalCategory: totalCategory,
    totalPage: totalPage
  }

  //end
  const categoryList = await Category
    .find(find)
    .sort({
      position: "desc"
    })
    .limit(limit)
    .skip(skip)


  for (const item of categoryList) {
    if (item.createdBy) {
      const inforAccountCreated = await accountAdmin.findOne({
        _id: item.createdBy,
      })
      // console.log("namecategory", inforAccountCreated)
      item.nameCeatedBy = inforAccountCreated.fullName;

    }


    if (item.updatedBy) {
      const inforAccountUpdate = await accountAdmin.findOne({
        _id: item.createdBy,
      })
      item.namedUpdatedBy = inforAccountUpdate.fullName;
    }

    item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY");
    item.updatedAtFormat = moment(item.updatedAt).format("HH:mm - DD/MM/YYYY");
  }

  // Body
  const accountList = await accountAdmin.find({}).select("id fullName");


  res.render('admin/pages/category-list', {
    pageTitle: "Quản lý danh mục",
    categoryList: categoryList,
    accountAdmin: accountList,
    pagination: pagination
  })


}

// ------------Create-------------
module.exports.create = async (req, res) => {

  const categoryList = await Category.find({
    deleted: false
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
  const RecordNew = await newRecord.save();

  console.log(RecordNew)

  req.flash("success", "Tạo danh mục thành công!");

  res.json({
    code: "success"
  })


}
// --------------Edit-----------------
module.exports.edit = async (req, res) => {

  try {
    const categoryList = await Category.find({
      deleted: false
    })

    const categoryTree = CategoryHelpers.CategoryTree(categoryList);

    const id = req.params.id;

    const categoryDetail = await Category.findOne({
      _id: id,
      deleted: false
    })


    res.render("admin/pages/category-edit", {
      pageTitle: "Chỉnh sửa danh mục",
      categoryList: categoryTree,
      categoryDetail: categoryDetail
    })
  } catch (error) {
    req.flash("error", "danh mục bị lỗi id !");
    res.redirect(`/${pathAdmin}/category/list`)
  }

}

module.exports.editPatch = async (req, res) => {

  try {
    const id = req.params.id

    if (req.body.position) {
      req.body.position = parseInt(req.body.position)
    } else {
      delete req.body.position
    }

    req.body.updatedBy = req.account.id



    // take photo in cloud
    if (req.file) {
      req.body.avatar = req.file.path;
    } else {
      delete req.body.avatar;
    }

    // updata Model

    console.log("dữ liệu req:".req.body)

    await Category.updateOne({
      _id: id,
      deleted: false
    }, req.body)

    req.flash("success", "Sửa danh mục thành công!");

    res.json({
      code: "success"
    })
  } catch (error) {
    req.flash("error", "Sửa danh mục thất bại!");
  }


}

// --------------- Delete --------------
module.exports.deletedPatch = async (req, res) => {

  try {
    const id = req.params.id
    // deleted Model

    await Category.updateOne({
      _id: id
    }, {
      deleted: true,
      deletedBy: req.account.id,
      deletedAt: Date.now()

    })

    req.flash("success", "Xóa danh mục thành công!");

    res.json({
      code: "success"
    })
  } catch (error) {
    req.flash("error", "Xóa danh mục thất bại!");
  }
}

// -------------- ChangeMulti -----------
module.exports.changeMultiPatch = async (req, res) => {
  try {
    const { option, ids } = req.body;

    switch (option) {
      case "active":
      case "inactive":
        await Category.updateMany({
          _id: { $in: ids }
        }, {
          status: option
        });
        req.flash("success", "Đổi trạng thái thành công!");
        break;
      case "delete":
        await Category.updateMany({
          _id: { $in: ids }
        }, {
          deleted: true,
          deletedBy: req.account.id,
          deletedAt: Date.now()
        });
        req.flash("success", "Xóa thành công!");
        break;
    }

    res.json({
      code: "success"
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Id không tồn tại trong hệ thông!"
    })
  }


}




module.exports.trash = async (req, res) => {
  if (!req.permissions.includes("category-trash")) {
    req.flash("error", "Bạn không có quyền xem thùng rác danh mục!");
    res.json({
      code: "error",
      message: "Bạn không có quyền xem thùng rác danh mục!"
    })
    return;
  }
  try {
    const find = {
      deleted: true,
    };

    // Lọc danh sách theo tìm kiếm
    if (req.query.keyword) {
      const search = slugify(req.query.keyword, {
        lower: true,
        strict: true,
        trim: true,
      });
      const regex = new RegExp(search, "i");
      find.slug = regex;
    }

    // Phân trang 
    const limit = 3;

    let page = 1

    if (req.query.page) {
      const pageCurrent = parseInt(req.query.page);
      if (pageCurrent > 0) {
        page = pageCurrent
      }
    }

    const skip = (page - 1) * limit

    const totalCategory = await Category.find({
      deleted: true,
    })

    const totalPage = Math.ceil(totalCategory.length / limit)

    const pagination = {
      skip: skip,
      totalCategory: totalCategory,
      totalPage: totalPage
    }

    //end
    const categoryList = await Category
      .find(find)
      .sort({
        position: "desc"
      })
      .limit(limit)
      .skip(skip)


    for (const item of categoryList) {
      if (item.createdBy) {
        const inforAccountCreated = await accountAdmin.findOne({
          _id: item.createdBy,
        })
        // console.log("namecategory", inforAccountCreated)
        item.nameCeatedBy = inforAccountCreated.name;

      }


      if (item.updatedBy) {
        const inforAccountUpdate = await accountAdmin.findOne({
          _id: item.createdBy,
        })
        item.namedUpdatedBy = inforAccountUpdate.name;
      }

      item.createdAtFormat = moment(item.createdAt).format("HH:mm - DD/MM/YYYY");
      item.updatedAtFormat = moment(item.updatedAt).format("HH:mm - DD/MM/YYYY");
    }

    res.render("admin/pages/category-trash", {
      pageTitle: "Thùng rác danh mục",
      categoryList: categoryList,
      pagination: pagination
    });
  } catch (error) {
    console.error("Lỗi khi xử lý thùng rác danh mục:", error.message);
    res.redirect("/admin/category/list"); // Chuyển hướng khi có lỗi
  }
}

module.exports.undoPatch = async (req, res) => {
  if (!req.permissions.includes("category-trash")) {
    req.flash("error", "Bạn không có quyền khôi phục danh mục!");
    res.json({
      code: "error",
      message: "Bạn không có quyền khôi phục danh mục!"
    })
    return;
  }
  try {
    const id = req.params.id;

    await Category.updateOne({
      _id: id,
      deleted: true
    }, {
      deleted: false,
    })

    req.flash("success", "Khôi phục danh mục thành công!")
    res.json({
      code: "success",
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    })
  }
}

module.exports.destroyDelete = async (req, res) => {
  if (!req.permissions.includes("category-trash")) {
    req.flash("error", "Bạn không có quyền xóa vĩnh viễn danh mục!");
    res.json({
      code: "error",
      message: "Bạn không có quyền xóa vĩnh viễn danh mục!"
    })
    return;
  }
  try {
    const id = req.params.id;

    await Category.deleteOne({
      _id: id,
      deleted: true
    })

    req.flash("success", "Xóa vĩnh viễn danh mục thành công!")
    res.json({
      code: "success",
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    })
  }
}

module.exports.trashChangeMultiPatch = async (req, res) => {
  try {
    const { option, ids } = req.body;

    switch (option) {
      case "undo":
        if (!req.permissions.includes("category-trash")) {
          req.flash("error", "Bạn không có quyền khôi phục danh mục!");
          res.json({
            code: "error",
            message: "Bạn không có quyền khôi phục danh mục!"
          })
          return;
        }
        await Category.updateMany({
          _id: { $in: ids },
          deleted: true
        }, {
          deleted: false,
        });
        req.flash("success", "Khôi phục thành công!");
        break;
      case "destroy-delete":
        if (!req.permissions.includes("category-trash")) {
          req.flash("error", "Bạn không có quyền xóa vĩnh viễn danh mục!");
          res.json({
            code: "error",
            message: "Bạn không có quyền xóa vĩnh viễn danh mục!"
          })
          return;
        }
        await Category.deleteMany({
          _id: { $in: ids },
          deleted: true
        });
        req.flash("success", "Xóa vĩnh viễn thành công!");
        break;
    }

    res.json({
      code: "success"
    })
  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "Id không tồn tại trong hệ thống!"
    })
  }
}

// const accountExist = await Category.find({}).select("createdBy");
//   let arrray = [];
//   for (const item of accountExist) {
//     arrray.push(item.createdBy);
//   }

//   const accountList = await accountAdmin.find({
//     _id: { $in: arrray }
//   }).select("id fullName");