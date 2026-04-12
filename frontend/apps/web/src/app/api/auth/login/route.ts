import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

export async function POST(req: Request) {
    try{
        const {email, password} = await req.json();  
        if(!email || !password) return NextResponse.json({error: 'Email and password are needed'}, {status: 400});

        const [rows] = await pool.query('SELECT id, email, passwordHash, role FROM user WHERE email = ?', [email]);
        const user = (rows as any[])[0];
        if(!user) return NextResponse.json({error: 'No user found'}, {status:401});
        const isLegit = await bcrypt.compare(password, user.passwordHash);
        if(!isLegit) return NextResponse.json({error: 'Email or Password is incorrect'}, {status: 401});

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || 'viewer' }, 
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        const response = NextResponse.json({
            message: 'Login Success',
            user:{
                id: user.id,
                email: user.email,
            }
        })
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax'
        })

        return response;

    }catch(err){
        console.error("Login error");
        console.error("[ERROR]: ", err);
        return NextResponse.json({error:'login failed'}, {status:500})
    }
}