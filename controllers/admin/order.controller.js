const Order = require("../../models/order.model");
const City = require("../../models/city.model");
const variableConfig = require("../../config/variable.config")
const moment = require("moment");
const { default: slugify } = require("slugify");


module.exports.list = async (req, res) => {

    const find = {
        deleted: false
    };

    //Status order
    if (req.query.statusOrder) {
        find.status = req.query.statusOrder
    }

    //Payment Method
    if (req.query.namePayment) {
        find.paymentMethod = req.query.namePayment
    }

    //Status Payment
    if (req.query.statusPayment) {
        find.paymentStatus = req.query.statusPayment
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

    // Tìm kiếm không theo slug search
    if (req.query.keyword) {

        const keyword = req.query.keyword;
        const keywordRegex = new RegExp(keyword, "i"); // i = không phân biệt hoa thường

        console.log("name", keywordRegex)
        find.$or = [
            { orderCode: keywordRegex },
            { fullName: keywordRegex },
            { phone: keywordRegex },
            { "items.name": keywordRegex }
        ];

    }

    // Phân trang
    const limit = 6;

    let page = 1

    if (req.query.page) {
        const pageCurrent = parseInt(req.query.page);
        if (pageCurrent > 0) {
            page = pageCurrent
        }
    }

    const skip = (page - 1) * limit

    const totalOrder = await Order.find({
        deleted: false
    })

    const totalPage = Math.ceil(totalOrder.length / limit)

    const pagination = {
        skip: skip,
        totalOrder: totalOrder,
        totalPage: totalPage
    }

    console.log("find: ", find)

    const orderList = await Order
        .find(find)
        .sort({
            createdAt: "desc" // asc
        })
        .limit(limit)
        .skip(skip)

    for (const orderDetail of orderList) {
        orderDetail.paymentMethodName = variableConfig.paymentMethod.find(item => item.value == orderDetail.paymentMethod).label;
        orderDetail.paymentStatusName = variableConfig.paymentStatus.find(item => item.value == orderDetail.paymentStatus).label;
        orderDetail.statusName = variableConfig.orderStatus.find(item => item.value == orderDetail.status).label;

        // Chuyển về time hiện tại từ mongoose
        orderDetail.createdAtTime = moment(orderDetail.createdAt).format("HH:mm");
        orderDetail.createdAtDate = moment(orderDetail.createdAt).format("DD/MM/YYYY");

    }

    // return res.status(400).json({
    //   code: "error",
    //   message: "Thiếu thông tin bắt buộc"
    // });


    // res.json({
    //     orderList: orderList,
    // })

    res.render('admin/pages/order-list', {
        pageTitle: "Danh sách order",
        orderList: orderList,
        pagination: pagination

    })
}
module.exports.edit = async (req, res) => {

    try {
        const id = req.params.id;

        const orderDetail = await Order.findOne({
            _id: id,
            deleted: false
        })

        orderDetail.createdAtFormat = moment(orderDetail.createdAt).format("YYYY-MM-DDTHH:mm");

        for (const item of orderDetail.items) {
            const city = await City.findOne({
                _id: item.locationFrom
            });
            item.locationFromName = city.name;
            item.departureDateFormat = moment(item.departureDate).format("DD/MM/YYYY");
        }

        res.render("admin/pages/order-edit", {
            pageTitle: `Đơn hàng: ${orderDetail.orderCode}`,
            orderDetail: orderDetail,
            paymentMethod: variableConfig.paymentMethod,
            paymentStatus: variableConfig.paymentStatus,
            orderStatus: variableConfig.orderStatus
        })

    } catch (error) {
        res.redirect(`/${pathAdmin}/order/list`);
    }

}

module.exports.editPatch = async (req, res) => {
    try {
        const id = req.params.id;

        const order = await Order.findOne({
            _id: id,
            deleted: false
        });

        if (!order) {
            res.json({
                code: "error",
                message: "Thông tin đơn hàng không hợp lệ!"
            })
            return;
        }

        await Order.updateOne({
            _id: id,
            deleted: false
        }, req.body);

        req.flash("success", "Cập nhật đơn hàng thành công!");

        res.status(500).json({
            code: "success"
        })
    } catch (error) {
        res.json({
            code: "error",
            message: "Thông tin đơn hàng không hợp lệ!"
        })
    }
}

module.exports.deletePatch = async (req, res) => {

    if (!req.permissions.includes("order-delete")) {
        res.json({
            code: "error",
            message: "Không có quyền sử dụng tính năng này!"
        })
        return;
    }


    try {
        const id = req.params.id
        // deleted Model

        await Order.updateOne({
            _id: id
        }, {
            deleted: true,
            deletedBy: req.account.id,
            deletedAt: Date.now()

        })

        req.flash("success", "Xóa tour thành công!");

        res.json({
            code: "success"
        })
    } catch (error) {
        req.flash("error", "Xóa tour thất bại!");
    }
}

// Thùng rác

module.exports.trash = async (req, res) => {
    const find = {
        deleted: true
    };

    //Status order
    if (req.query.statusOrder) {
        find.status = req.query.statusOrder
    }

    //Payment Method
    if (req.query.namePayment) {
        find.paymentMethod = req.query.namePayment
    }

    //Status Payment
    if (req.query.statusPayment) {
        find.paymentStatus = req.query.statusPayment
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

    // Tìm kiếm không theo slug
    if (req.query.keyword) {

        const keyword = req.query.keyword;
        const keywordRegex = new RegExp(keyword, "i"); // i = không phân biệt hoa thường

        console.log("name", keywordRegex)
        find.$or = [
            { fullName: keywordRegex },
            { phone: keywordRegex },
            { "items.name": keywordRegex }
        ];

    }

    // Phân trang
    const limit = 6;

    let page = 1

    if (req.query.page) {
        const pageCurrent = parseInt(req.query.page);
        if (pageCurrent > 0) {
            page = pageCurrent
        }
    }

    const skip = (page - 1) * limit

    const totalOrder = await Order.find({
        deleted: true
    })

    const totalPage = Math.ceil(totalOrder.length / limit)

    const pagination = {
        skip: skip,
        totalOrder: totalOrder,
        totalPage: totalPage
    }

    const orderList = await Order
        .find(find)
        .sort({
            createdAt: "desc"
        })
        .limit(limit)
        .skip(skip)

    for (const orderDetail of orderList) {
        orderDetail.paymentMethodName = variableConfig.paymentMethod.find(item => item.value == orderDetail.paymentMethod).label;
        orderDetail.paymentStatusName = variableConfig.paymentStatus.find(item => item.value == orderDetail.paymentStatus).label;
        orderDetail.statusName = variableConfig.orderStatus.find(item => item.value == orderDetail.status).label;

        orderDetail.createdAtTime = moment(orderDetail.createdAt).format("HH:mm");
        orderDetail.createdAtDate = moment(orderDetail.createdAt).format("DD/MM/YYYY");

    }




    res.render('admin/pages/order-trash', {
        pageTitle: "Danh sách order",
        orderList: orderList,
        pagination: pagination

    })
}

module.exports.undoPatch = async (req, res) => {

    if (!req.permissions.includes("order-trash")) {
        res.json({
            code: "error",
            message: "Không có quyền sử dụng tính năng này!"
        })
        return;
    }


    try {
        const id = req.params.id;

        await Order.updateOne({
            _id: id
        }, {
            deleted: false

        })

        req.flash("success", "Khôi phục tour thành công!");

        res.json({
            code: "success"
        })
    } catch (error) {
        req.flash("error", "Khôi phục thất bại!");
    }

}

module.exports.deleteDestroyDelete = async (req, res) => {

    if (!req.permissions.includes("order-trash")) {
        res.json({
            code: "error",
            message: "Không có quyền sử dụng tính năng này!"
        })
        return;
    }


    try {
        const id = req.params.id;
        await Order.deleteOne({
            _id: id
        })

        req.flash("success", "Đã xóa vĩnh viễn tour thành công!");


        res.json({
            code: "success"
        })
    } catch (error) {
        req.flash("error", "Khôi phục thất bại!");
    }

}
