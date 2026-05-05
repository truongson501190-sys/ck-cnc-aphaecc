const login = async (msnv: string, password: string, remember = false) => {
  console.log("🔐 Login attempt for:", msnv);

  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.error("❌ Supabase chưa cấu hình");
      return false;
    }

    // 1. Kiểm tra bảng user_records (mật khẩu)
    const { data: record, error: err1 } = await supabase
      .from('user_records')
      .select('*')
      .eq('msnv', msnv)
      .eq('status', true)
      .single();

    if (err1 || !record) {
      console.error("❌ Không tìm thấy user_records");
      return false;
    }

    if (atob(record.passwordHash) !== password) {
      console.error("❌ Sai mật khẩu");
      return false;
    }

    // 2. Lấy thông tin user
    const { data: userData, error: err2 } = await supabase
      .from('users')
      .select('*')
      .eq('msnv', msnv)
      .single();

    if (err2 || !userData) {
      console.error("❌ Không tìm thấy user");
      return false;
    }

    // 3. Lưu session
    setUser(userData);

    if (remember) {
      localStorage.setItem("sessionUser", JSON.stringify(userData));
    } else {
      sessionStorage.setItem("sessionUser", JSON.stringify(userData));
    }

    console.log("✅ Login thành công");
    return true;

  } catch (err) {
    console.error("💥 Login error:", err);
    return false;
  }
};