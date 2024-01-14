const { generateToken } = require('../config/jwtToken');
const User = require('../models/employeemodel')
const asyncHandler = require('express-async-handler');
const validateMongoID = require('../utils/validatemongoid');
const { generateRefreshToken } = require('../config/RefreshToken');
const jwt = require('jsonwebtoken');
const sendEmail = require('./emailcontroller');
const crypto = require('crypto');
const Cart = require('../models/cartModel')
const Product = require('../models/productmodel');
const Coupon = require('../models/couponmodel')
const Order = require('../models/ordermodel')
const uniqid = require('uniqid')

//to check if the user is already exist if not then create one
const createuser = asyncHandler(async (req,res) => {
    const email = req.body.email;
const finduser =await User.findOne({email:email});
if (!finduser){
    const newuser = await User.create(req.body);
    res.json(newuser);
}else{
    //throw new Error("User already exist")
    res.json({
        message:"User already exist"
    })      
}
});

//login 
const loginUserControl = asyncHandler(async (req,res) => {
    const { email , password } = req.body;
    //check if user exist or not
    const finduser = await User.findOne({ email });
    if (finduser && await finduser.isPasswordMatched(password)){
        const RefreshToken = generateRefreshToken(finduser?.id);
        const updateuser = await User.findByIdAndUpdate(finduser?.id, {
            RefreshToken:RefreshToken
        },
        {new :true }
        )
        res.cookie("RefreshToken",RefreshToken ,{
            httpOnly : true,
            maxAge : 72 * 60 * 60 * 1000,
        })
        res.json({
            _id: finduser?._id,
            firstname: finduser?.firstname,
            lastname:finduser?.lastname,
            email: finduser?.email,
            mobile: finduser?.mobile,
            token: generateToken(finduser?._id),
        })

    }else{
        throw new Error('Invalid Credential')
    }
    
})

//admin login

const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    // check if user exists or not
    const findAdmin = await User.findOne({ email });
    if (findAdmin.role !== "admin") throw new Error("Not Authorised");
    if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
      const RefreshToken = await generateRefreshToken(findAdmin?._id);
      const updateuser = await User.findByIdAndUpdate(
        findAdmin.id,
        {
            RefreshToken: RefreshToken,
        },
        { new: true }
      );
      res.cookie("refreshToken", RefreshToken, {
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000,
      });
      res.json({
        _id: findAdmin?._id,
        firstname: findAdmin?.firstname,
        lastname: findAdmin?.lastname,
        email: findAdmin?.email,
        mobile: findAdmin?.mobile,
        token: generateToken(findAdmin?._id),
      });
    } else {
      throw new Error("Invalid Credentials");
    }
  });



//handle refresh token

const handleRefreshToken = asyncHandler( async (req,res) => {
    const cookie = req.cookies;
    //console.log(cookie)
    if(!cookie?.RefreshToken) throw new Error("No Refresh Token in cookies ")
    const RefreshToken = cookie.RefreshToken;
    //console.log(RefreshToken)
    const user = await User.findOne({ RefreshToken })
    //console.log(user.id)
    if(!user) throw new Error(" No Refresh token present in db or not matched")
    //res.json(userid)
    jwt.verify(RefreshToken, process.env.JWT_SECRET, (err,decoded) => {
    //console.log(decoded)
    if( err || user.id !== decoded.id) throw new Error("There is something Wrong with RefreshToken");
    const accessToken = generateToken(user?._id)
    res.json({accessToken});
});
})


//logout functionality

const logout = asyncHandler( async (req , res) => {
    const cookie = req.cookies;
    if(!cookie?.RefreshToken) throw new Error("No Refresh Token in cookies ")
    const RefreshToken = cookie.RefreshToken;
    const user = await User.findOne({ RefreshToken })
    if(!user){
        res.clearCookie('RefreshToken',{
        httpOnly : true,
        secure : true,
    });
    return res.sendStatus(204); //forbidden
}
await User.findOneAndUpdate(RefreshToken, {
    RefreshToken : " ",
});
res.clearCookie('RefreshToken',{
    httpOnly : true,
    secure : true,
})
res.sendStatus(204); //forbidden
})

//to get all User
const getalluser = asyncHandler(async(req,res) => {
    try{
        const getuser =await User.find();
        res.json(getuser)
    }catch(error){
        res.json({error}) 
    }
}
)
//single users
const singleuser = asyncHandler(async(req,res) => {
    const {id} = req.params;
    validateMongoID(id);
    try{
        const getuser =await User.findById(id);
        res.json({getuser});

    }catch(error){
        res.json({error})
    }
})

// save user Address

const saveAddress = asyncHandler(async (req, res, next) => {
    const { _id } = req.user;
    validateMongoID(_id);
  
    try {
      const updatedUser = await User.findByIdAndUpdate(
        _id,
        {
          address: req?.body?.address,
        },
        {
          new: true,
        }
      );
      res.json(updatedUser);
    } catch (error) {
      throw new Error(error);
    }
});


//update the users
const updateusr = asyncHandler(async (req,res) => {
    const {_id} = req.user;
    validateMongoID(_id);
    try{
        const Updateuser =await User.findByIdAndUpdate(_id,{
            name:req?.body?.name,
            lastname:req.body.lastname,
            email:req.body.email,
            mobile:req.body.mobile,
        },{
            new : true
        });
        res.json(Updateuser)
    }catch(error){
        res.json({error})
    }
})
//delete a user

const deleteuser = asyncHandler(async (req,res) => {
    const {id} = req.params;
    try{
        const deleteusr = await User.findByIdAndDelete(id)
        res.json({
            message:"User successfully deleted"
        })
    }catch(error){
        res.json({error})
        //throw new Error(error)

    }
})

//Blocking the block
const blockUser = asyncHandler(async(req,res) => {
    const { _id } = req.user;
    validateMongoID(_id);   
    try{
        const block = await User.findByIdAndUpdate(_id,{
            isBlocked: true,
        },{
            new:true,
        })
        res.json({
            message: "User Block"
        })
    }catch(error){
        throw new Error(error);
    }
})
const unblockUser = asyncHandler(async(req,res) => {
    const {_id} = req.user;
    validateMongoID(_id);
    try{
        const unblock =await User.findByIdAndUpdate(
            _id,
            {
                isBlocked: false,
            },
            {
            new: true,
            }
        )
        res.json({
            message: "User UNBlock"
        });
        }catch(error){
        throw new Error(error)
    }
});


//reseting the password

const updatePassword = asyncHandler(async(req,res) =>{
    const {_id} = req.user;
    const {password} = req.body;
    validateMongoID(_id);
    const user = await User.findById(_id);
    if(password) {
        user.password = password
        const updatedpassword = await user.save()
        res.json(updatedpassword)
    }else{
        res.json(user)
    }
})


const forgotPasswordToken = asyncHandler(async (req,res) => {
    const {email} = req.body;
    const user = await User.findOne({email})
    if(!user) throw new Error('User not Found with this email')
    try{
        const token = await user.createPasswordResetToken();
        await user.save();
        const resetURL = `Hii , Please follow this link to reset Your Password, This link is valid till 10 minutes from now. <a href='http:localhost:6000/api/user/reset-password/${token}'>Click Here</a>`
        const data={
            to:email,
            text:"Hey User",
            subject:"Forgot Password Link",
            html:resetURL,
        };
        sendEmail(data)
        res.json(token)
    }catch(error){
    throw new Error(error)
}

})


const resetPassword = asyncHandler(async(req,res) => {
    const {password} = req.body;
    const {token} = req.params;
    const hashedtoken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
        passwordResetToken : hashedtoken,
        passwordResetexpires: {$gt : Date.now()}
    });
    if(!user) throw new Error("Token expired! Please try again later")
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetexpires = undefined;
    await user.save()
    res.json(user);
})

const getWishlist = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    console.log(req.user);
    try {
      const findUser = await User.findById(_id).populate("wishlist");
      res.json(findUser);
    } catch (error) {
      throw new Error(error);
    }
});


const userCart = asyncHandler(async(req, res)=>{
    //console.log(req.user);
    const { cart } = req.body;
    const {_id} = req.user;
    validateMongoID(_id);
    try {
      let products = [];
      const user = await User.findById(_id);
      // check if user already have product in cart
      const alreadyExistCart = await Cart.findOne({ orderby: user._id });
      if (alreadyExistCart) {
        alreadyExistCart.remove();
      }
      for (let i = 0; i < cart.length; i++) {
        let object = {};
        object.product = cart[i]._id;
        object.count = cart[i].count;
        object.color = cart[i].color;
        let getPrice = await Product.findById(cart[i]._id).select('price').exec();
        object.price = getPrice.price;
        products.push(object);
      }
      let cartTotal = 0;
      for (let i = 0; i < products.length; i++) {
        cartTotal = cartTotal + products[i].price * products[i].count;
      }
      let newCart = await new Cart({
        products,
        cartTotal,
        orderby: user?._id,
      }).save();
      res.json(newCart);
    } catch (error) {
      throw new Error(error);
    }
});

const getUserCart = asyncHandler(async (req, res) => {
    //console.log(req.user);
    const { _id } = req.user;
    validateMongoID(_id);
    try {
      const cart = await Cart.findOne({ orderby: _id }).populate(
        "products.product"
      );
      res.json(cart);
    } catch (error) {
      throw new Error(error);
    }
});

const emptyCart = asyncHandler(async (req, res) => {
    console.log(req.user);
    const { _id } = req.user;
    validateMongoID(_id);
    try {
      const user = await User.findOne({ _id });
      const cart = await Cart.findOneAndDelete({ orderby: user._id });
      res.json(cart);
    } catch (error) {
      throw new Error(error);
    }
});


//Applying Coupon

const applyCoupon = asyncHandler(async (req, res) => {
    const { coupon } = req.body;
    const { _id } = req.user;
    validateMongoID(_id);
    const validCoupon = await Coupon.findOne({ name: coupon });
    if (validCoupon === null) {
      throw new Error("Invalid Coupon");
    }
    const user = await User.findOne({ _id });
    let { cartTotal } = await Cart.findOne({
      orderby: user._id,
    }).populate("products.product");
    let totalAfterDiscount = (
      cartTotal -
      (cartTotal * validCoupon.discount) / 100
    ).toFixed(2);
    await Cart.findOneAndUpdate(
      { orderby: user._id },
      { totalAfterDiscount },
      { new: true }
    );
    res.json(totalAfterDiscount);
});


const createOrder = asyncHandler(async (req, res) => {
    const { COD, couponApplied } = req.body;
    const { _id } = req.user;
    validateMongoID(_id);
    try {
      if (!COD) throw new Error("Create cash order failed");
      const user = await User.findById(_id);
      let userCart = await Cart.findOne({ orderby: user._id });
      let finalAmout = 0;
      if (couponApplied && userCart.totalAfterDiscount) {
        finalAmout = userCart.totalAfterDiscount;
      } else {
        finalAmout = userCart.cartTotal;
      }
  
      let newOrder = await new Order({
        products: userCart.products,
        paymentIntent: {
          id: uniqid(),
          method: "COD",
          amount: finalAmout,
          status: "Cash on Delivery",
          created: Date.now(),
          currency: "usd",
        },
        orderby: user._id,
        orderStatus: "Cash on Delivery",
      }).save();
      let update = userCart.products.map((item) => {
        return {
          updateOne: {
            filter: { _id: item.product._id },
            update: { $inc: { quantity: -item.count, sold: +item.count } },
          },
        };
      });
      const updated = await Product.bulkWrite(update, {});
      res.json({ message: "success" });
    } catch (error) {
      throw new Error(error);
    }
});

const getOrders = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    validateMongoID(_id);
    try {
      const userorders = await Order.findOne({ orderby: _id })
        .populate("products.product")
        .populate("orderby")
        .exec();
      res.json(userorders);
    } catch (error) {
      throw new Error(error);
    }
});

//upadting order status (only Admin Can)
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;
    validateMongoID(id);
    try {
      const updateOrderStatus = await Order.findByIdAndUpdate(
        id,
        {
          orderStatus: status,
          paymentIntent: {
            status: status,
          },
        },
        { new: true }
      );
      res.json(updateOrderStatus);
    } catch (error) {
      throw new Error(error);
    }
});


module.exports={
    getalluser ,
    createOrder,
    applyCoupon,
    emptyCart,
    forgotPasswordToken , 
    resetPassword, 
    saveAddress, 
    getWishlist, 
    createuser , 
    updateusr ,
    loginAdmin, 
    singleuser , 
    deleteuser , 
    loginUserControl , 
    blockUser , 
    unblockUser , 
    updatePassword ,
    handleRefreshToken , 
    userCart ,
    getUserCart,
    logout,
    getOrders,
    updateOrderStatus
}