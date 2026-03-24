import { NextRequest, NextResponse } from "next/server";
import {v4 as uuidv4} from 'uuid';
import bcrypt from 'bcryptjs';
import pool from "@/lib/db";
export async function POST(req: Request) {
    const body = await req.json();
    const { email, password } = body

    if(!email || !password) return NextResponse.json({error: 'Missing needed fields'}, {status: 400});

    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasNumber = /\d/.test(password);

    if(password.length < 8 || !hasNumber || !hasSpecialChar) return NextResponse.json({error: 'Make sure password is of length 8, has a special character and a number'}, {status: 400});

    try{
    // DB Connection
        const [existing] = await pool.query('SELECT id FROM user WHERE email = ?', [email]);
        if((existing as any).length > 0) return NextResponse.json({error: 'User already exists'}, {status: 409});

        const id = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO user (id, email, passwordHash) VALUES (?, ?, ?)', [id, email, passwordHash] 
        )
        return NextResponse.json({message: 'User Created Successfully', userID: id})
    }catch(err){
        console.error("User Registration Failed");
        console.error("[ERROR]: ", err);
        return NextResponse.json({error: 'Internal Server Error'}, {status: 500});
    }
}