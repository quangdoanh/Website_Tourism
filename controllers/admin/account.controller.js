// Models
const Tour = require("../../models/tour.model")
const accountAdmin = require("../../models/accountAdmin.model")
const forgotPassword = require("../../models/forgot-password.model")

// Mã hóa mật khẩu
const bcrypt = require("bcryptjs");
// token
const jwt = require("jsonwebtoken")
// helpers
const generate = require("../../helpers/generate.helper")
const mail = require("../../helpers/mail.helper")

// --------------- REGISTER ---------------

module.exports.registerGet = (req, res) => {

    res.render('admin/pages/register.pug', {
        pageTitle: "Trang register"
    })
}
module.exports.registerPost = async (req, res) => {

    const { name, email, password } = req.body;  // client gửi lên json thư viện app.use(express.json()); sẽ giúp tự động chuyển sang js

    const existEmail = await accountAdmin.findOne({
        email: email
    });

    if (existEmail) {
        res.json({
            code: "error",
            message: "Email đã tồn tại"
        })
        return
    }

    const salt = bcrypt.genSaltSync(10); // 10 là số vòng (rounds) để tạo salt
    const hashedPassword = bcrypt.hashSync(password, salt);  // là hàm dùng để mã hóa mật khẩu.


    const newAdmin = new accountAdmin({
        name: name,
        email: email,
        password: hashedPassword,
        status: "intitial"
    })

    await newAdmin.save();

    res.json({
        code: "success",
        message: "Đăng ký thành công"
    }) // gửi dữ liệu dạng JSON ( chuẩn về API)


}
// ------------ LOGIN --------------------
module.exports.login = (req, res) => {

    res.render('admin/pages/login.pug', {
        pageTitle: "Trang login"
    })
}
module.exports.loginPost = async (req, res) => {



    const { email, password, rememberPassword } = req.body;

    const existAccount = await accountAdmin.findOne({
        email: email
    });

    if (!existAccount) {
        res.json({
            code: "error",
            message: "Email or Password wrong"
        })
        return
    }

    const isPassword = await bcrypt.compare(password, existAccount.password);

    if (!isPassword) {
        res.json({
            code: "error",
            message: "Email or Password wrong"
        })
        return
    }


    if (existAccount.status == "initial") {
        res.json({
            code: "error",
            message: "Tai khoan chua duoc kich hoat"
        })
        return
    }

    if (existAccount.status == "inactive") {
        res.json({
            code: "error",
            message: "Tai khoan da duoc tam dung hoat dong"
        })
        return
    }

    const token = jwt.sign(
        {
            id: existAccount.id,
            email: existAccount.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: rememberPassword ? '30d' : '1d'  // 30 hoặc 1 day

        })

    //Lưu token vào cookies
    res.cookie("token", token, {
        maxAge: rememberPassword ? (30 * 24 * 60 * 60 * 1000) : (24 * 60 * 60 * 1000), // Token có hiệu lực trong 1 ngày
        httpOnly: true,
        sameSite: "strict"
    })

    console.log("Body:", req.body);
    console.log("Token:", token);

    req.flash("success", "Đăng nhập thành công")

    res.json({
        code: "success",
        message: "Đăng nhập thành công"
    })



}
// --------------lOGOUT ----------------------
module.exports.logoutPost = (req, res) => {

    console.log("chạy vào đay")

    res.clearCookie("token");

    res.json({
        code: "success",
        message: "Đăng xuất thành công"
    })
}
// -------------- REGISTERINITAL -----------
module.exports.registerInitial = (req, res) => {

    res.render('admin/pages/register-initial.pug', {
        pageTitle: "Trang chờ phê duyệt tài khoản"
    })
}
// ---------------- FORGOTPASSWORD -----------
module.exports.forgotPassword = (req, res) => {

    res.render('admin/pages/forgot-password.pug', {
        pageTitle: "Trang quên mật khẩu"
    })
}
module.exports.forgotPasswordPost = async (req, res) => {

    const { email } = req.body

    // check email exits
    const existEmail = await accountAdmin.findOne({
        email: email
    });

    if (!existEmail) {
        res.json({
            code: "error",
            message: "Email không tồn tại"
        })

        return;
    }

    // check mail xem duoc gui chua
    const mailSend = await forgotPassword.findOne({
        email: email
    })

    if (mailSend) {
        res.json({
            code: "error",
            message: "Email đã được gửi vui lòng chờ sau 5 phút"
        })
        return;
    }

    // create otp 
    const otp = generate.generateRandomNumber(6);

    // save in new model
    const newRecord = new forgotPassword({
        email: email,
        otp: otp,
        expireAt: Date.now() + 5 * 60 * 1000
    })
    await newRecord.save();
    // send otp email
    const subject = `Mã OTP lấy lại mật khẩu`;
    const content = `Mã OTP của bạn là <b style="color: green;">${otp}</b>. Mã OTP có hiệu lực trong 5 phút, vui lòng không cung cấp cho bất kỳ ai.`;

    mail.sendMail(email, subject, content)

    res.json({
        code: "success",
        message: "Đã gửi mã OTP qua email"
    });

}
// ------------ OTP PASSWORD -------------
module.exports.otpPassword = (req, res) => {

    res.render('admin/pages/otp-password.pug', {
        pageTitle: "Trang nhập mã OTP"
    })
}
module.exports.otpPasswordPost = async (req, res) => {

    const { otp, email } = req.body;

    console.log(otp)
    console.log(email)

    // check email and otp exit

    const emailOTP = await forgotPassword.findOne({
        email: email,
        otp: otp
    })

    if (!emailOTP) {
        res.json({
            code: "error",
            message: "Nhập otp sai"
        })
        return;
    }

    // tim model account 

    const accountOld = await accountAdmin.findOne({
        email: email,
    })

    // tao token  va luu vao trong cookies

    const token = jwt.sign(
        {
            id: accountOld.id,
            email: accountOld.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '1d'  // 30 hoặc 1 day

        })

    //Lưu token vào cookies
    res.cookie("token", token, {
        maxAge: 24 * 60 * 60 * 1000, // Token có hiệu lực trong 1 ngày
        httpOnly: true,
        sameSite: "strict"
    })

    res.json({
        code: "success",
        message: "Nhập OTP đúng"
    })
}
// ----------------- RESET PASSWORD ---------------
module.exports.resetPassword = (req, res) => {

    res.render('admin/pages/reset-password.pug', {
        pageTitle: "Reset password"
    })
}
module.exports.resetPasswordPost = async (req, res) => {

    const { password } = req.body;

    console.log(password)


    // encryption password
    const salt = bcrypt.genSaltSync(10); // 10 là số vòng (rounds) để tạo salt
    const hashedPassword = bcrypt.hashSync(password, salt);  // là hàm dùng để mã hóa mật khẩu.

    // take infor account from validate
    console.log(req.account)


    // update password

    await accountAdmin.updateOne({
        _id: req.account.id,
        status: "active"
    }, {
        password: hashedPassword
    })

    res.json({
        code: "success",
        message: "Đổi mật khẩu thành công!"
    })


}